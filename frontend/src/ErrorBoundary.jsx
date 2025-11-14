import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mt-5 text-center">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">¡Oops! Algo salió mal</h4>
            <p>Ha ocurrido un error inesperado. Por favor, regresa al inicio.</p>
            <hr />
            <button 
              className="btn btn-primary" 
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
            >
              🏠 Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;