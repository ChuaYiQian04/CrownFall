export function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The connection faltered. Please try again.";
}
