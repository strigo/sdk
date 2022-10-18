import { isRecordingMode } from './modules/assessment-recorder/assessment-recorder';
import { Logger } from './services/logger';
import { Strigo } from './strigo';

window.Strigo = Strigo;

if (isRecordingMode()) {
  Logger.info('Strigo recorder mode');
  window.Strigo.assessmentRecorder();
} else {
  window.Strigo.init();
}
