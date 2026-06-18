"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type ErrorBoundaryProps = { children: React.ReactNode; fallback?: React.ReactNode; name?: string };

type ErrorBoundaryState = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="error-boundary-fallback">
          <AlertTriangle size={22} />
          <strong>عذراً، حدث خطأ في {this.props.name || "هذا القسم"}</strong>
          <p>{this.state.error?.message || "حاول إعادة التحميل أو تواصل مع الدعم."}</p>
          <button className="btn btn-soft" type="button" onClick={this.handleRetry}>
            <RefreshCw size={16} /> إعادة تحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
