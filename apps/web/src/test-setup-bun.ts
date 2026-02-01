// Setup file for bun test - provides jsdom-like environment
import { JSDOM } from "jsdom";

// Create a JSDOM instance
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
	url: "http://localhost",
	pretendToBeVisual: true,
	resources: "usable",
});

// Set up global objects
global.window = dom.window as unknown as Window & typeof globalThis;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;

// Polyfill requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
	return setTimeout(callback, 0);
};

global.cancelAnimationFrame = (id: number) => {
	clearTimeout(id);
};

// Export for use in tests
export { dom };
