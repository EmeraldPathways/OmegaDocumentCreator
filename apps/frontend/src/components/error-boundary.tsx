import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Omega runtime error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ margin: "2rem auto", maxWidth: "800px" }}>
          <h1>Something went wrong</h1>
          <p>The application crashed while rendering this page.</p>
          {this.state.error ? (
            <pre
              style={{
                background: "#f8f9fa",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "1rem",
                overflow: "auto",
                fontSize: "0.875rem",
              }}
            >
              {this.state.error.toString()}
              {"\n"}
              {this.state.errorInfo?.componentStack}
            </pre>
          ) : null}
          <button
            className="btn btn-primary"
            onClick={() => window.location.assign("/")}
            style={{ marginTop: "1rem" }}
            type="button"
          >
            Go to home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
