/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as anomalies from "../anomalies.js";
import type * as ciAnalysis from "../ciAnalysis.js";
import type * as ciAnalysisActions from "../ciAnalysisActions.js";
import type * as github from "../github.js";
import type * as http from "../http.js";
import type * as tests from "../tests.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  anomalies: typeof anomalies;
  ciAnalysis: typeof ciAnalysis;
  ciAnalysisActions: typeof ciAnalysisActions;
  github: typeof github;
  http: typeof http;
  tests: typeof tests;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
