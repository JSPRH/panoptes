import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function APIDocs() {
	return (
		<div className="container mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-3xl font-bold mb-2">API Documentation</h1>
				<p className="text-muted-foreground">
					Interactive API documentation for all Convex endpoints. This spec is automatically
					generated from your Convex deployment.
				</p>
			</div>
			<div className="swagger-ui-wrapper">
				<SwaggerUI url="/convex-spec.yaml" />
			</div>
		</div>
	);
}
