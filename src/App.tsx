import { Component, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/navbar';
import Process from './components/table';

const queryClient = new QueryClient();

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center text-red-600 py-8">
          <h2>Something went wrong in the Process component.</h2>
          <p>{this.state.error?.message}</p>
          <p>
            Learn more about error boundaries at{' '}
            <a
              href="https://react.dev/link/error-boundaries"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#60A5FA] hover:underline"
            >
              React Error Boundaries
            </a>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Navbar />
        <Process />
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;