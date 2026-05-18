/**
 * PM2 Ecosystem Configuration — HolidaiButler Platform
 *
 * Bootstrap skelet voor Node 22 LTS Migration (FASE B).
 * Plan-referentie: docs/migrations/NODE-22-MIGRATION-PLAN.md (Aanpak B — per-wave snippet).
 *
 * Bestandsnaam: ecosystem.config.cjs (.cjs extensie verplicht — project root
 *               package.json heeft "type":"module", dus Node behandelt .js als
 *               ESM en require() faalt. .cjs forceert CommonJS-context die PM2
 *               verwacht voor module.exports.)
 *
 * Geschiedenis:
 *   2026-05-18: Initial bootstrap (Sessie 1 pre-werk). Geen processen ingevuld.
 *               Single source of truth voor PM2-config blijft /root/.pm2/dump.pm2
 *               totdat per-wave cutovers (Wave 1+) services migreren naar dit bestand.
 *
 * Waarschuwing: NOOIT `pm2 ecosystem` uitvoeren in deze directory — dat
 *               commando overschrijft dit bestand met PM2's default template.
 *
 * Per-wave migratie-aanpak (Aanpak B uit plan §5.2, gepatcht 2026-05-18):
 *   1. Voor cutover van service X (bv. Wave 1 = holidaibutler-agenda):
 *      - Voeg service-blok toe aan `apps` array hieronder
 *      - Set `interpreter` expliciet naar /root/.nvm/versions/node/v22.22.3/bin/node
 *      - Commit deze wijziging op feature/node22-wave<N>-<service>-<datum>
 *   2. Op cutover-moment:
 *      - `pm2 delete <service-name>` (verwijdert service uit dump.pm2)
 *      - `pm2 start /var/www/api.holidaibutler.com/ecosystem.config.js --only <service-name>`
 *      - `pm2 save` (persisteert nieuwe state in dump.pm2)
 *   3. Rollback per service:
 *      - `pm2 delete <service-name>`
 *      - Restore dump.pm2 uit /root/backups/2026-05-18-node22-session1/dump.pm2.pre-session1
 *      - `pm2 resurrect`
 *
 * Template service-blok (NIET ACTIEF — alleen referentie voor toekomstige waves):
 *
 *   {
 *     name: 'holidaibutler-<service>',
 *     cwd: '/var/www/api.holidaibutler.com/<module>',
 *     script: '<script-path>',
 *     interpreter: '/root/.nvm/versions/node/v22.22.3/bin/node',
 *     instances: 1,
 *     exec_mode: 'fork',
 *     env: { NODE_ENV: 'production' },
 *     max_memory_restart: '<limit>',
 *     error_file: '/var/log/pm2/<service>-error.log',
 *     out_file: '/var/log/pm2/<service>-out.log',
 *     time: true,
 *   },
 *
 * BELANGRIJK:
 *   - Sessie 1 pre-werk gebruikt deze file alleen als git-getrackte placeholder.
 *   - PM2 negeert dit bestand totdat een wave-cutover expliciet
 *     `pm2 start ecosystem.config.js --only <name>` aanroept.
 *   - Apparte services blijven op dump.pm2 onder /usr/bin/node 20.19.6 totdat
 *     hun wave is uitgevoerd.
 */

module.exports = {
  apps: [
    // Bootstrap-skelet — geen processen.
    // Wave 1+ vult deze array per service-cutover (zie plan §5.2 + header-doc).
  ],
};
