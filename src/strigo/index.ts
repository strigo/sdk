import * as urlTools from '../modules/url/url';
import * as configManager from '../modules/config/config';
import * as sessionManager from '../modules/session/session';
import * as eventsStorageManager from '../modules/events-storage/events-storage';
import { Logger } from '../services/logger';
import * as widgetFactory from '../modules/widgets/widget-factory';
import { MESSAGE_TYPES } from '../modules/listeners/listeners.types';

import { SDKSetupData, SDK_TYPES, IStrigoSDK, SdkConfig } from './types';

class StrigoSDK implements IStrigoSDK {
  private config: SdkConfig = {};

  init(): void {
    try {
      Logger.info('Initializing SDK...');

      if (this.config.initialized) {
        Logger.info('SDK was already initialized');

        return;
      }

      eventsStorageManager.init();

      // Get init script parameters
      const { webApiKey, subDomain, selectedWidgetFlavor } = urlTools.extractInitScriptParams();

      if (!webApiKey || !subDomain || !selectedWidgetFlavor) {
        throw new Error('Init data is missing');
      }

      const widgetFlavor = widgetFactory.getWidgetFlavor(selectedWidgetFlavor);

      configManager.init({ webApiKey, subDomain, selectedWidgetFlavor: widgetFlavor });

      const widget = widgetFactory.getWidget(widgetFlavor);
      this.config.sdkType = widget.init();
      this.config.initialized = true;

      Logger.info('Initialized SDK.');

      // Auto open academy if it was opened in this session before.
      if (this.config.sdkType !== SDK_TYPES.CHILD && sessionManager.isPanelOpen()) {
        this.setup();
      }
    } catch (err) {
      Logger.error('Could not initialize SDK', { err });
    }
  }

  async setup(data?: SDKSetupData): Promise<void> {
    try {
      Logger.info('Starting to setup SDK...');

      // Setup won't do anything for now (child will only be able to send events later)
      if (this.config.isOpen || this.config.sdkType === SDK_TYPES.CHILD) {
        Logger.info('panel is already opened');

        return;
      }

      if (!this.config.initialized) {
        throw new Error('SDK was not initialized');
      }

      const config = configManager.getConfig();

      const { email, token, development = false, version, openWidget = true } = { ...config.user, ...config, ...data };

      if (!development && (!email || !token)) {
        throw new Error('Setup data is missing');
      }

      const configuration = await configManager.fetchRemoteConfiguration(token, development);

      if (configuration) {
        const { loggingConfig } = configuration;
        Logger.debug('Configuration fetched from Strigo');
        Logger.setup(loggingConfig);
      }

      configManager.setup({
        user: {
          email,
          token,
        },
        initSite: urlTools.getUrlData(),
        development,
        version,
        loggingConfig: configuration?.loggingConfig,
      });

      this.config.configured = true;
      Logger.info('Finished SDK setup.');

      if (openWidget) {
        this.open();
      }
    } catch (err) {
      Logger.error('Could not setup SDK', { err });
    }
  }

  open(): void {
    try {
      Logger.info('Opening academy panel...');

      if (!this.config.configured) {
        throw new Error('SDK was not set up');
      }

      if (this.config.isOpen || this.config.sdkType === SDK_TYPES.CHILD) {
        Logger.info('Panel is already opened');

        return;
      }

      const config = configManager.getConfig();

      sessionManager.setup({
        currentUrl: config.initSite.href,
        isPanelOpen: true,
        isLoading: true,
        widgetFlavor: config.selectedWidgetFlavor,
      });

      const widget = widgetFactory.getWidget(config.selectedWidgetFlavor);
      widget.setup({ version: config.version, development: config.development });
      this.config.isOpen = true;
      Logger.info('Opened academy panel.');
    } catch (err) {
      Logger.error('Could not open academy panel', { err });
    }
  }

  shutdown(): void {
    try {
      Logger.info('Closing academy panel...');

      if (this.config.sdkType === SDK_TYPES.CHILD) {
        window.parent.postMessage(MESSAGE_TYPES.SHUTDOWN, '*');

        return;
      }

      const widget = widgetFactory.getWidget(sessionManager.getWidgetFlavor());
      sessionManager.clearSession();

      widget.shutdown();
      this.config.isOpen = false;
      Logger.info('Closed academy panel.');
    } catch (err) {
      Logger.error('Could not close academy panel', { err });
    }
  }

  destroy(): void {
    try {
      Logger.info('Destroying SDK...');

      configManager.clearConfig();
      this.config = {};
      this.shutdown();

      Logger.info('Destroyed SDK.');
    } catch (err) {
      Logger.error('Could not destroy SDK', { err });
    }
  }

  sendEvent(eventName: string): void {
    eventsStorageManager.pushEventValue({ eventName });
    Logger.debug('sendEvent called', { eventName });
  }
}

export const Strigo = new StrigoSDK();
