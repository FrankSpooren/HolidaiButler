/**
 * Temporal Workflow: Destination Onboarding Saga
 * 7 steps wrapping OB1-OB7: config -> branding -> pages -> chatbot -> agents -> content -> verify
 * Compensation: per OB-step rollback
 */
import { proxyActivities, sleep } from '@temporalio/workflow';

const {
  sendAlert, pushDashboardEvent
} = proxyActivities({ startToCloseTimeout: '5 minutes' });

const {
  setupDestinationConfig, setupBranding, setupPages,
  setupChatbot, setupAgents, setupInitialContent, verifyOnboarding,
  rollbackDestinationConfig, rollbackBranding, rollbackPages,
  rollbackChatbot, rollbackAgents, rollbackContent
} = proxyActivities({ startToCloseTimeout: '30 minutes' });

export async function destinationOnboardingSaga(input) {
  const { destination_id, destination_name, config } = input;
  const compensations = [];
  const steps = [];

  try {
    // OB1: Config
    await setupDestinationConfig({ destination_id, config });
    compensations.push(() => rollbackDestinationConfig({ destination_id }));
    steps.push('config');

    // OB2: Branding
    await setupBranding({ destination_id, branding: config.branding });
    compensations.push(() => rollbackBranding({ destination_id }));
    steps.push('branding');

    // OB3: Pages
    await setupPages({ destination_id, pages: config.pages });
    compensations.push(() => rollbackPages({ destination_id }));
    steps.push('pages');

    // OB4: Chatbot
    await setupChatbot({ destination_id, chatbot: config.chatbot });
    compensations.push(() => rollbackChatbot({ destination_id }));
    steps.push('chatbot');

    // OB5: Agents
    await setupAgents({ destination_id });
    compensations.push(() => rollbackAgents({ destination_id }));
    steps.push('agents');

    // OB6: Initial content
    await setupInitialContent({ destination_id });
    compensations.push(() => rollbackContent({ destination_id }));
    steps.push('content');

    // OB7: Verify
    const verification = await verifyOnboarding({ destination_id });
    steps.push('verify');

    await pushDashboardEvent('onthaler', 'onboarding_saga_completed', 'info', {
      destination_id, destination_name, steps, checks_passed: verification.passed
    });

    return { success: true, destination_id, steps, verification };
  } catch (error) {
    for (const compensate of compensations.reverse()) {
      try { await compensate(); } catch (e) { /* continue */ }
    }
    await sendAlert('critical', `Onboarding saga failed for ${destination_name}: ${error.message}`, { steps });
    throw error;
  }
}
