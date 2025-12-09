import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  handleRefresh = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              문제가 발생했습니다
            </h1>
            <p className="text-muted-foreground mb-6">
              예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 홈으로 이동해주세요.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-muted rounded-lg text-left">
                <p className="text-xs font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={this.handleRefresh}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                새로고침
              </Button>
              <Button onClick={this.handleReset} className="gap-2">
                홈으로 이동
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
