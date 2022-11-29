import { z } from 'zod';

export const PatientTemperature = z.object({
  id: z.string(),
  temperature: z.number(),
});

export type PatientTemperature = z.infer<typeof PatientTemperature>;
