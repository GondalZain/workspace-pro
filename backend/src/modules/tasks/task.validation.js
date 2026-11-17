const priorities = ['low', 'medium', 'high'];
const statuses = ['pending', 'in-progress', 'completed'];

function validateTaskInput(input) {
  if (!input || typeof input.title !== 'string' || !input.title.trim()) return 'A non-empty title is required.';
  if (input.projectId == null || input.projectId === '') return 'Project is required.';
  if (Number.isNaN(Number(input.projectId)) || Number(input.projectId) <= 0) return 'Project must be a valid selection.';
  if (input.priority && !priorities.includes(input.priority)) return 'Priority must be low, medium, or high.';
  if (input.status && (typeof input.status !== 'string' || !input.status.trim() || input.status.length > 50)) {
    return 'Status must be a valid status string.';
  }
  if (input.estimatedMinutes != null && input.estimatedMinutes !== '') {
    const minutes = Number(input.estimatedMinutes);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59940) {
      return 'Estimated time must be between 0 and 999 hours.';
    }
  }
  return null;
}

module.exports = { validateTaskInput };
