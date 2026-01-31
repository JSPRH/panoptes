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
import type * as anomaliesActions from "../anomaliesActions.js";
import type * as ciAnalysis from "../ciAnalysis.js";
import type * as ciAnalysisActions from "../ciAnalysisActions.js";
import type * as github from "../github.js";
import type * as http from "../http.js";
import type * as scheduled from "../scheduled.js";
import type * as testFailureAnalysis from "../testFailureAnalysis.js";
import type * as testFailureAnalysisActions from "../testFailureAnalysisActions.js";
import type * as testSuggestions from "../testSuggestions.js";
import type * as testSuggestionsActions from "../testSuggestionsActions.js";
import type * as tests from "../tests.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  anomalies: typeof anomalies;
  anomaliesActions: typeof anomaliesActions;
  ciAnalysis: typeof ciAnalysis;
  ciAnalysisActions: typeof ciAnalysisActions;
  github: typeof github;
  http: typeof http;
  scheduled: typeof scheduled;
  testFailureAnalysis: typeof testFailureAnalysis;
  testFailureAnalysisActions: typeof testFailureAnalysisActions;
  testSuggestions: typeof testSuggestions;
  testSuggestionsActions: typeof testSuggestionsActions;
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
