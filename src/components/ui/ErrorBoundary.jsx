'use client';

import React, { Component } from 'react';
import { AlertTriangleIcon, ArrowPathIcon } from './Icons';

/**
 * @fileoverview Robust React Error Boundary Component
 * 
 * Why this component is created:
 * - Prevents unexpected component rendering errors from crashing the entire page (white screen of death).
 * - Implements graceful local degradation with dark glassmorphic styling and a retry ("重新載入") button.
 * - Supports custom fallback components, error event logging, and automatic reset when monitored keys change.
 */

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Why: Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Why: Log the caught error for debugging and pass it to optional error reporting hooks.
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, errorInfo);
      } catch (logErr) {
        console.error('[ErrorBoundary] onError callback failed:', logErr);
      }
    }
  }

  componentDidUpdate(prevProps) {
    // Why: Automatically reset error state if specified resetKeys changed (e.g. stock symbol or tab switch).
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, idx) => key !== (prevProps.resetKeys && prevProps.resetKeys[idx])
      );
      if (hasChanged) {
        this.handleReset();
      }
    }
  }

  handleReset = () => {
    // Why: Reset local error state and trigger optional consumer callback.
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    if (typeof this.props.onReset === 'function') {
      try {
        this.props.onReset();
      } catch (resetErr) {
        console.error('[ErrorBoundary] onReset callback failed:', resetErr);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      const {
        fallback,
        fallbackTitle = '區塊載入發生異常',
        fallbackMessage = '此區塊暫時無法正常渲染，您可以嘗試重新載入。',
        className = ''
      } = this.props;

      // Why: Allow callers to supply custom fallback elements or render functions.
      if (typeof fallback === 'function') {
        return fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetErrorBoundary: this.handleReset
        });
      }

      if (fallback) {
        return fallback;
      }

      // Default elegant glassmorphic localized fallback card
      return (
        <div
          role="alert"
          aria-live="assertive"
          className={`border border-red-900/40 bg-gradient-to-b from-red-950/20 via-slate-900/60 to-slate-900/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl text-center flex flex-col items-center justify-center my-4 ${className}`}
        >
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-3 shadow-inner">
            <AlertTriangleIcon className="w-6 h-6" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-100 mb-1">
            {fallbackTitle}
          </h3>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-5 leading-relaxed">
            {this.state.error?.message || fallbackMessage}
          </p>

          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            <span>重新載入</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component to wrap any component with an ErrorBoundary.
 * 
 * @param {React.ComponentType} WrappedComponent - Component to wrap
 * @param {Object} [boundaryProps] - Props passed to ErrorBoundary
 * @returns {React.ComponentType}
 */
export function withErrorBoundary(WrappedComponent, boundaryProps = {}) {
  const ComponentWithErrorBoundary = (props) => (
    <ErrorBoundary {...boundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
