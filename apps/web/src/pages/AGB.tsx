import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent } from "../components/ui/card";

export default function AGB() {
	return (
		<div className="space-y-8">
			<PageHeader
				title="Terms and Conditions"
				description="Allgemeine Geschäftsbedingungen (AGB)"
			/>

			<Card>
				<CardContent className="pt-6">
					<div className="prose prose-sm max-w-none">
						<div className="space-y-6 text-muted-foreground">
							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									1. Scope of Application
								</h2>
								<p>
									These Terms and Conditions ("AGB") apply to the use of Panoptes, a test
									visualization platform ("Service") provided by [Company Name] ("Provider"). By
									accessing or using the Service, you agree to be bound by these Terms and
									Conditions.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									2. Description of Service
								</h2>
								<p>
									Panoptes is a platform that ingests test results from multiple testing frameworks
									and provides insights into your testing pyramid, test coverage, CI runs, and
									related metrics. The Service includes visualization tools, analytics, and
									integration with various testing frameworks and CI/CD systems.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									3. User Accounts and Registration
								</h2>
								<p>
									To use certain features of the Service, you may be required to register for an
									account. You agree to provide accurate, current, and complete information during
									registration and to update such information to keep it accurate, current, and
									complete. You are responsible for maintaining the confidentiality of your account
									credentials and for all activities that occur under your account.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									4. Acceptable Use
								</h2>
								<p>You agree not to:</p>
								<ul className="list-disc pl-6 space-y-2 mt-2">
									<li>Use the Service for any illegal purpose or in violation of any laws</li>
									<li>Transmit any harmful code, viruses, or malicious software</li>
									<li>Attempt to gain unauthorized access to the Service or related systems</li>
									<li>Interfere with or disrupt the Service or servers</li>
									<li>Use the Service to violate the rights of others</li>
									<li>Reverse engineer, decompile, or disassemble any part of the Service</li>
								</ul>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									5. Data and Privacy
								</h2>
								<p>
									Your use of the Service is also governed by our Privacy Policy. By using the
									Service, you consent to the collection, use, and sharing of your data as described
									in the Privacy Policy. We process test data and related information to provide the
									Service and improve our offerings.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									6. Intellectual Property
								</h2>
								<p>
									The Service, including its original content, features, and functionality, is owned
									by the Provider and is protected by international copyright, trademark, patent,
									trade secret, and other intellectual property laws. You may not modify, reproduce,
									distribute, create derivative works, publicly display, or otherwise exploit the
									Service without prior written permission from the Provider.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									7. Limitation of Liability
								</h2>
								<p>
									To the maximum extent permitted by law, the Provider shall not be liable for any
									indirect, incidental, special, consequential, or punitive damages, or any loss of
									profits or revenues, whether incurred directly or indirectly, or any loss of data,
									use, goodwill, or other intangible losses resulting from your use of the Service.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									8. Service Availability
								</h2>
								<p>
									The Provider strives to ensure the Service is available and functioning properly.
									However, the Service is provided "as is" and "as available" without warranties of
									any kind. The Provider does not guarantee that the Service will be uninterrupted,
									error-free, or free from defects. The Provider reserves the right to modify,
									suspend, or discontinue the Service at any time without prior notice.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									9. Modifications to Terms
								</h2>
								<p>
									The Provider reserves the right to modify these Terms and Conditions at any time.
									We will notify users of any material changes by posting the new Terms on this page
									and updating the "Last Updated" date. Your continued use of the Service after such
									modifications constitutes acceptance of the updated Terms.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									10. Termination
								</h2>
								<p>
									The Provider may terminate or suspend your access to the Service immediately,
									without prior notice or liability, for any reason, including if you breach these
									Terms and Conditions. Upon termination, your right to use the Service will cease
									immediately.
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									11. Governing Law
								</h2>
								<p>
									These Terms and Conditions shall be governed by and construed in accordance with
									the laws of [Jurisdiction], without regard to its conflict of law provisions. Any
									disputes arising from these Terms shall be subject to the exclusive jurisdiction
									of the courts of [Jurisdiction].
								</p>
							</div>

							<div>
								<h2 className="font-heading text-2xl font-semibold mb-4 text-foreground">
									12. Contact Information
								</h2>
								<p>
									If you have any questions about these Terms and Conditions, please contact us at:
									<br />
									Email: [Email Address]
									<br />
									Address: [Company Address]
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
