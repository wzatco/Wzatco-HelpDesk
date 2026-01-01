/**
 * Field Registry - Single Source of Truth for Automation Fields
 * 
 * Defines all fields available for automation conditions and actions,
 * including their types, operators, and value sources.
 */

import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  STATUS_LABELS,
  PRIORITY_LABELS
} from "./constants.js";

/**
 * Field types for automation conditions
 * @typedef {"ENUM" | "RELATION" | "DATE" | "TEXT" | "BOOLEAN"} FieldType
 */

/**
 * Field Registry - Defines all available fields for automation
 * 
 * Each field definition includes:
 * - label: Human-readable name
 * - type: Field type (ENUM, RELATION, DATE, TEXT, BOOLEAN)
 * - operators: Available operators for this field type
 * - values: For ENUM types, the list of valid values
 * - labels: For ENUM types, human-readable labels
 * - source: For RELATION types, the data source (e.g., "AGENTS", "DEPARTMENTS")
 */
export const FIELD_REGISTRY = {
  status: {
    label: "Status",
    type: "ENUM",
    operators: ["equals", "not_equals", "in"],
    values: TICKET_STATUSES,
    labels: STATUS_LABELS
  },
  priority: {
    label: "Priority",
    type: "ENUM",
    operators: ["equals", "not_equals"],
    values: TICKET_PRIORITIES,
    labels: PRIORITY_LABELS
  },
  assigneeId: {
    label: "Assigned Agent",
    type: "RELATION",
    operators: ["equals", "not_equals", "changed"],
    source: "AGENTS"
  },
  departmentId: {
    label: "Department",
    type: "RELATION",
    operators: ["equals", "not_equals"],
    source: "DEPARTMENTS"
  },
  createdAt: {
    label: "Created Time",
    type: "DATE",
    operators: ["before", "after", "between"]
  }
};

/**
 * Get field definition from registry
 * @param {string} fieldKey - The field key (e.g., "status", "priority")
 * @returns {object|null} Field definition or null if not found
 */
export function getFieldDefinition(fieldKey) {
  return FIELD_REGISTRY[fieldKey] || null;
}

/**
 * Check if a field exists in the registry
 * @param {string} fieldKey - The field key
 * @returns {boolean} True if field exists
 */
export function hasField(fieldKey) {
  return fieldKey in FIELD_REGISTRY;
}

/**
 * Get all field keys
 * @returns {string[]} Array of field keys
 */
export function getFieldKeys() {
  return Object.keys(FIELD_REGISTRY);
}

/**
 * Get fields by type
 * @param {string} type - Field type (ENUM, RELATION, etc.)
 * @returns {object} Object with field keys as keys and definitions as values
 */
export function getFieldsByType(type) {
  const result = {};
  for (const [key, definition] of Object.entries(FIELD_REGISTRY)) {
    if (definition.type === type) {
      result[key] = definition;
    }
  }
  return result;
}

