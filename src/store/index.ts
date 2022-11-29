import { PatientTemperature } from '../model';

export interface PatientStore {
  putPatientTemperature: (
    patientTemperature: PatientTemperature
  ) => Promise<void>;
}
