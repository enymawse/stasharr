import { z } from 'zod';

export const ConfigValidation = z.object({
  protocol: z.boolean({
    required_error: 'Protocol must be true or false.',
    invalid_type_error: 'Protocol must be a boolean.',
  }),
  domain: z.string().min(1, {
    message: 'Domain is required.',
  }),
  whisparrApiKey: z.string().min(1, {
    message: 'API Key is required.',
  }),
  qualityProfile: z
    .number({
      required_error: 'Quality profile is required.',
      invalid_type_error: 'Quality profile is required.',
    })
    .min(0, {
      message: 'Quality profile must be a non-negative number.',
    }),
  rootFolderPath: z.string().min(1, {
    message: 'Root folder path is required.',
  }),
  searchForNewMovie: z.boolean({
    required_error: 'Search for new movie must be true or false.',
    invalid_type_error: 'Search for new movie must be a boolean.',
  }),
  stashDomain: z.string().url().nullable(),
});

export const BasicConfigValidation = z.object({
  protocol: z.boolean(),
  domain: z.string().min(1),
  whisparrApiKey: z.string().min(1),
});

export const StashConfigValidation = z.object({
  stashDomain: z.string().url(),
  stashApiKey: z.string().min(1),
});
