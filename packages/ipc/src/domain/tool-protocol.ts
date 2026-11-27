import { z } from 'zod';

export const protocolVersionSchema = z.literal(1);

export const toolDescriptorSchema = z
  .object({
    name: z.string().min(1),
    label: z.string(),
    description: z.string(),
    inputSchema: z.record(z.string(), z.json()),
  })
  .strict();

export type ToolDescriptor = z.infer<typeof toolDescriptorSchema>;

export const subscribeRequestSchema = z
  .object({
    protocolVersion: protocolVersionSchema,
    method: z.literal('subscribeTools'),
  })
  .strict();

export const invokeRequestSchema = z
  .object({
    protocolVersion: protocolVersionSchema,
    method: z.literal('invokeTool'),
    revision: z.string().min(1),
    name: z.string().min(1),
    input: z.record(z.string(), z.json()),
  })
  .strict();

export const requestSchema = z.discriminatedUnion('method', [
  subscribeRequestSchema,
  invokeRequestSchema,
]);

export type Request = z.infer<typeof requestSchema>;

export const toolsAvailableSchema = z
  .object({
    protocolVersion: protocolVersionSchema,
    type: z.literal('toolsAvailable'),
    revision: z.string().min(1),
    appId: z.string(),
    tools: z.array(toolDescriptorSchema),
  })
  .strict();

export const toolsUnavailableSchema = z
  .object({
    protocolVersion: protocolVersionSchema,
    type: z.literal('toolsUnavailable'),
  })
  .strict();

export const invocationSuccessSchema = z
  .object({
    protocolVersion: protocolVersionSchema,
    type: z.literal('invocationSuccess'),
    value: z.json(),
  })
  .strict();

export const protocolErrorSchema = z
  .object({
    protocolVersion: protocolVersionSchema,
    type: z.literal('error'),
    code: z.enum([
      'invalidRequest',
      'unsupportedVersion',
      'unavailable',
      'staleRevision',
      'unknownTool',
      'busy',
      'invalidInput',
      'toolFailed',
      'internal',
    ]),
    message: z.string(),
  })
  .strict();
