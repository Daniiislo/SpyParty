/** Fixed voting-phase countdown in seconds. Server-authoritative (written as an
 * absolute deadline); the client shows this as the initial value. Independent of
 * the per-turn describe timer — voting always gets this window. */
export const VOTE_TIMER_SECONDS = 30;
