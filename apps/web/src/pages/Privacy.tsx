import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent } from "../components/ui/card";

export default function Privacy() {
	return (
		<div className="space-y-8">
			<PageHeader title="Privacy Policy" description="Data Privacy Declaration" />

			<Card>
				<CardContent className="pt-6">
					<div className="prose prose-sm max-w-none">
						<div className="space-y-6 text-muted-foreground">
							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									1. Introduction
								</h2>
								<p>
									This Privacy Policy explains how Panoptes ("we", "us", or "our") collects, uses,
									discloses, and protects your information when you use our test visualization
									platform ("Service"). We are committed to protecting your privacy and ensuring
									transparency about our data practices.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									2. Information We Collect
								</h2>
								<h3 className="font-semibold text-foreground mb-2">2.1 Information You Provide</h3>
								<p>We collect information that you provide directly to us, including:</p>
								<ul className="list-disc pl-6 space-y-2 mt-2">
									<li>Account registration information (email address, username)</li>
									<li>Test results and test execution data</li>
									<li>Project and repository information</li>
									<li>CI/CD workflow data</li>
									<li>Communication data when you contact us</li>
								</ul>

								<h3 className="font-semibold text-foreground mb-2 mt-4">
									2.2 Automatically Collected Information
								</h3>
								<p>
									When you use the Service, we automatically collect certain information, including:
								</p>
								<ul className="list-disc pl-6 space-y-2 mt-2">
									<li>Usage data and analytics</li>
									<li>Device information and browser type</li>
									<li>IP address and location data</li>
									<li>Cookies and similar tracking technologies</li>
									<li>Log files and error reports</li>
								</ul>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									3. How We Use Your Information
								</h2>
								<p>We use the collected information for the following purposes:</p>
								<ul className="list-disc pl-6 space-y-2 mt-2">
									<li>To provide, maintain, and improve the Service</li>
									<li>To process and visualize your test results</li>
									<li>To generate insights and analytics about your testing pyramid</li>
									<li>To communicate with you about the Service</li>
									<li>To detect and prevent fraud, abuse, or security issues</li>
									<li>To comply with legal obligations</li>
									<li>To develop new features and services</li>
								</ul>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									4. Data Sharing and Disclosure
								</h2>
								<p>
									We do not sell your personal information. We may share your information in the
									following circumstances:
								</p>
								<ul className="list-disc pl-6 space-y-2 mt-2">
									<li>
										<strong className="text-foreground">Service Providers:</strong> We may share
										data with third-party service providers who perform services on our behalf
										(e.g., cloud hosting, analytics)
									</li>
									<li>
										<strong className="text-foreground">Legal Requirements:</strong> We may disclose
										information if required by law or to protect our rights
									</li>
									<li>
										<strong className="text-foreground">Business Transfers:</strong> In the event of
										a merger, acquisition, or sale of assets, your information may be transferred
									</li>
									<li>
										<strong className="text-foreground">With Your Consent:</strong> We may share
										information with your explicit consent
									</li>
								</ul>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									5. Data Storage and Security
								</h2>
								<p>
									We implement appropriate technical and organizational measures to protect your
									information against unauthorized access, alteration, disclosure, or destruction.
									However, no method of transmission over the Internet or electronic storage is 100%
									secure. We store your data on secure servers and use encryption where appropriate.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									6. Your Rights and Choices
								</h2>
								<p>
									Depending on your location, you may have the following rights regarding your
									personal information:
								</p>
								<ul className="list-disc pl-6 space-y-2 mt-2">
									<li>
										<strong className="text-foreground">Access:</strong> Request access to your
										personal information
									</li>
									<li>
										<strong className="text-foreground">Correction:</strong> Request correction of
										inaccurate information
									</li>
									<li>
										<strong className="text-foreground">Deletion:</strong> Request deletion of your
										personal information
									</li>
									<li>
										<strong className="text-foreground">Portability:</strong> Request transfer of
										your data to another service
									</li>
									<li>
										<strong className="text-foreground">Objection:</strong> Object to processing of
										your information
									</li>
									<li>
										<strong className="text-foreground">Restriction:</strong> Request restriction of
										processing
									</li>
								</ul>
								<p className="mt-4">
									To exercise these rights, please contact us using the information provided in
									Section 9.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									7. Cookies and Tracking Technologies
								</h2>
								<p>
									We use cookies and similar tracking technologies to track activity on our Service
									and hold certain information. You can instruct your browser to refuse all cookies
									or to indicate when a cookie is being sent. However, if you do not accept cookies,
									you may not be able to use some portions of our Service.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									8. Data Retention
								</h2>
								<p>
									We retain your personal information for as long as necessary to provide the
									Service and fulfill the purposes outlined in this Privacy Policy, unless a longer
									retention period is required or permitted by law. When we no longer need your
									information, we will securely delete or anonymize it.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									9. International Data Transfers
								</h2>
								<p>
									Your information may be transferred to and processed in countries other than your
									country of residence. These countries may have data protection laws that differ
									from those in your country. We take appropriate safeguards to ensure your
									information receives adequate protection.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									10. Children's Privacy
								</h2>
								<p>
									Our Service is not intended for children under the age of 13 (or the applicable
									age of majority in your jurisdiction). We do not knowingly collect personal
									information from children. If you believe we have collected information from a
									child, please contact us immediately.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									11. Changes to This Privacy Policy
								</h2>
								<p>
									We may update this Privacy Policy from time to time. We will notify you of any
									changes by posting the new Privacy Policy on this page and updating the "Last
									Updated" date. You are advised to review this Privacy Policy periodically for any
									changes.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									12. Contact Us
								</h2>
								<p>
									If you have any questions about this Privacy Policy or our data practices, please
									contact us at:
									<br />
									Email: [Email Address]
									<br />
									Address: [Company Address]
									<br />
									Data Protection Officer: [DPO Contact Information]
								</p>
							</div>

							<div className="pt-4 border-t border-border">
								<p className="text-sm">
									<strong className="text-foreground">Last Updated:</strong>{" "}
									{new Date().toLocaleDateString()}
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="flex gap-4">
				<Link to="/" className="text-sm text-primary hover:underline">
					← Back to Homepage
				</Link>
				<Link to="/dashboard" className="text-sm text-primary hover:underline">
					Go to Dashboard →
				</Link>
			</div>
		</div>
	);
}
