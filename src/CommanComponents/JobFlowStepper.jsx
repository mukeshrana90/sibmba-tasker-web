import React from "react";
import {
  getBookingFlowStepperState,
  getTaskFlowStepperState,
  JOB_FLOW_STEP_LABELS,
} from "../utils/jobFlowStatus";

/**
 * Horizontal 5-step progress: Posted → Accepted → On the Way → In Progress → Completed.
 * @param {{ mode: 'task' | 'booking'; status: unknown; className?: string }} props
 */
export default function JobFlowStepper({ mode, status, className = "" }) {
  const model =
    mode === "booking"
      ? getBookingFlowStepperState(status)
      : getTaskFlowStepperState(status);

  const { activeStep, variant, terminalLabel } = model;
  const steps = JOB_FLOW_STEP_LABELS;
  const lastIndex = steps.length - 1;

  return (
    <div className={`job-flow-stepper ${className}`.trim()}>
      {(variant === "rejected" || variant === "cancelled") && (
        <p
          className={`job-flow-stepper__banner job-flow-stepper__banner--${variant}`}
          role="status"
        >
          {terminalLabel ||
            (variant === "cancelled" ? "Cancelled" : "Rejected")}
        </p>
      )}

      <div className="job-flow-stepper__row">
        {steps.map((label, index) => {
          const isTerminal = activeStep < 0;
          const isPast = !isTerminal && index < activeStep;
          const isCurrent = !isTerminal && index === activeStep;

          let nodeClass = "job-flow-stepper__node";
          if (isTerminal) {
            nodeClass += " job-flow-stepper__node--muted";
          } else if (isPast) {
            nodeClass += " job-flow-stepper__node--past";
          } else if (isCurrent) {
            nodeClass += " job-flow-stepper__node--current";
          } else {
            nodeClass += " job-flow-stepper__node--future";
          }

          const showLine = index < lastIndex;
          let lineClass = "job-flow-stepper__line";
          if (isTerminal) {
            lineClass += " job-flow-stepper__line--muted";
          } else if (index < activeStep) {
            lineClass += " job-flow-stepper__line--done";
          } else {
            lineClass += " job-flow-stepper__line--todo";
          }

          return (
            <React.Fragment key={label}>
              <div className="job-flow-stepper__step">
                <div className={nodeClass} aria-current={isCurrent ? "step" : undefined}>
                  {isCurrent && !isTerminal ? (
                    <svg
                      width="14"
                      height="11"
                      viewBox="0 0 14 11"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M1 5.5L5 9.5L13 1.5"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </div>
                <span
                  className={`job-flow-stepper__label${
                    isCurrent && !isTerminal
                      ? " job-flow-stepper__label--current"
                      : ""
                  }`}
                >
                  {label}
                </span>
              </div>
              {showLine && <div className={lineClass} aria-hidden />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
