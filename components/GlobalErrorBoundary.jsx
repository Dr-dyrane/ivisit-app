import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and save error info
    console.error('Global Error Boundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Try to show toast if available, but don't crash if it's not
    try {
      if (this.props.showToast && typeof this.props.showToast === 'function') {
        this.props.showToast('Something went wrong. Please restart the app.', 'error');
      }
    } catch (toastError) {
      // Silently ignore toast errors to prevent infinite loops
      console.warn('Could not show error toast:', toastError);
    }
    
    // Also log to a service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <View style={styles.container}>
          <Text style={styles.title}>App Error</Text>
          <Text style={styles.subtitle}>Something went wrong</Text>
          <Text style={styles.subtitle}>Please restart the app</Text>
          {__DEV__ && (
            <>
              <Text style={styles.errorText}>
                Error: {this.state.error?.toString()}
              </Text>
              <Text style={styles.errorText}>
                Stack: {this.state.errorInfo?.componentStack}
              </Text>
            </>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#ff0000',
    textAlign: 'center',
    marginBottom: 5,
  },
});

export default GlobalErrorBoundary;
