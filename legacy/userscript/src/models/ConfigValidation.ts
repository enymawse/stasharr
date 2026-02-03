import { z } from 'zod';
import { UrlProcessor } from '../util/urlProcessor';

export const ConfigValidation = z.object({
  protocol: z.boolean({
    required_error: 'Protocol must be true or false.',
    invalid_type_error: 'Protocol must be a boolean.',
  }),
  domain: z
    .string()
    .min(1, { message: 'Domain is required.' })
    .refine(
      (val) => {
        const result = UrlProcessor.parseWhisparrUrl(val, false); // We'll check both protocols
        return result.isValid;
      },
      {
        message: 'Please enter a valid Whisparr address (e.g., localhost:6969)',
      },
    ),
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
  stashDomain: z
    .string()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true; // nullable, so empty is okay
        const result = UrlProcessor.parseStashUrl(val);
        return result.isValid;
      },
      {
        message: 'Please enter a valid Stash URL (e.g., http://localhost:9999)',
      },
    ),
  openLinksInNewTab: z.boolean({
    required_error: 'Link behavior must be true or false.',
    invalid_type_error: 'Link behavior must be a boolean.',
  }),
});

export const BasicConfigValidation = z.object({
  protocol: z.boolean(),
  domain: z
    .string()
    .min(1)
    .refine(
      (val) => {
        const result = UrlProcessor.parseWhisparrUrl(val, false);
        return result.isValid;
      },
      {
        message: 'Invalid Whisparr address format',
      },
    ),
  whisparrApiKey: z.string().min(1),
});

export const StashConfigValidation = z.object({
  stashDomain: z.string().refine(
    (val) => {
      const result = UrlProcessor.parseStashUrl(val);
      return result.isValid;
    },
    {
      message: 'Please enter a valid Stash URL (e.g., http://localhost:9999)',
    },
  ),
  stashApiKey: z.string().min(1),
});
