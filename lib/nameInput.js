// Shared "person name" input rule used across every form that collects a
// human name (contact person, customer name, full name, team member name,
// etc.) — letters and spaces only, no digits or symbols. Strips invalid
// characters as the user types rather than validating after the fact, so
// the field simply can't contain a number or special character.
const NAME_CHARS_REGEX = /[^A-Za-z ]/g;

export function sanitizeNameInput(value) {
  return (value || "").replace(NAME_CHARS_REGEX, "");
}

export function isValidName(value) {
  return /^[A-Za-z]+( [A-Za-z]+)*$/.test((value || "").trim());
}
