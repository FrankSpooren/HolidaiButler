/**
 * HolidAIButler Mobile App - Entry Point
 * Mediterranean AI Travel Platform
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

// Configure global error handling
import './src/utils/errorHandler';

// Configure background tasks
import './src/services/backgroundTasks';

AppRegistry.registerComponent(appName, () => App);