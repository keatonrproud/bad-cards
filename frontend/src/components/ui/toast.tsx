import React from "react";

// Minimal test components
export const ToastProvider = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const ToastViewport = () => <div>viewport</div>;
export const Toast = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const ToastTitle = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const ToastDescription = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const ToastClose = () => <button>×</button>;

export type ToastProps = {};
export type ToastActionElement = React.ReactElement;
