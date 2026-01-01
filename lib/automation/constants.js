/**
 * Automation Constants - Single Source of Truth
 * 
 * These constants define the canonical values for ticket fields
 * used throughout the automation engine and UI.
 * 
 * Based on Field Audit Report (FIELD_AUDIT_REPORT.md)
 */

// Status values - canonical list matching UI and expected ticket lifecycle
export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting",
  "on_hold",
  "resolved",
  "closed"
];

// Priority values - canonical list matching database and UI
export const TICKET_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent"
];

// Human-readable labels for status values
export const STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  on_hold: "On Hold",
  resolved: "Resolved",
  closed: "Closed"
};

// Human-readable labels for priority values
export const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent"
};

