import { z } from 'zod';

// Client creates envelope IDs to be able to tell which envelopes were ignored
const envelopeIdSchema = z.string().min(1).max(128);

// Client sends envelope with ID and payload
export const envelopeSchema = z
  .object({
    type: z.literal('message'),
    id: envelopeIdSchema,
    data: z.json(),
  })
  .strict();

export type IncomingEnvelope = z.infer<typeof envelopeSchema>;


// Server replies to a specific envelope
export const replySchema = z
  .object({
    type: z.literal('reply'),
    id: envelopeIdSchema,
    data: z.json(),
  })
  .strict();

// A server can also send event envelopes
export const eventSchema = z
  .object({
    type: z.literal('event'),
    data: z.json(),
  })
  .strict();

export const notIgnoredOutgoingEnvelopeSchema = z.discriminatedUnion('type', [
  replySchema,
  eventSchema,
]);
export type NotIgnoredOutgoingEnvelope = z.infer<
  typeof notIgnoredOutgoingEnvelopeSchema
>;


// Server can respond to a envelope by sending an 'ignored' signal
export const ignoredEnvelopeSchema = z
  .object({
    type: z.literal('ignored'),
    id: envelopeIdSchema,
  })
  .strict();

export const outgoingEnvelopeSchema = z.discriminatedUnion('type', [
  replySchema,
  ignoredEnvelopeSchema,
  eventSchema,
]);

export type OutgoingEnvelope = z.infer<typeof outgoingEnvelopeSchema>;
