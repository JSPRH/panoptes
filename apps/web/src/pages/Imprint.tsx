import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Card, CardContent } from "../components/ui/card";

export default function Imprint() {
	return (
		<div className="space-y-8">
			<PageHeader title="Imprint" description="Legal information" />

			<Card>
				<CardContent className="pt-6">
					<div className="prose prose-sm max-w-none">
						<h2 className="font-heading text-2xl font-semibold mb-4">
							Information according to § 5 TMG
						</h2>
						<div className="space-y-4 text-muted-foreground">
							<p>
								<strong className="text-foreground">Panoptes</strong>
								<br />
								[Company Name]
								<br />
								[Street Address]
								<br />
								[Postal Code] [City]
								<br />
								[Country]
							</p>

							<div>
								<h3 className="font-heading text-xl font-semibold mb-2 text-foreground">Contact</h3>
								<p>
									Phone: [Phone Number]
									<br />
									Email: [Email Address]
									<br />
									Website: [Website URL]
								</p>
							</div>

							<div>
								<h3 className="font-heading text-xl font-semibold mb-2 text-foreground">
									Responsible for content according to § 55 Abs. 2 RStV
								</h3>
								<p>
									[Name]
									<br />
									[Street Address]
									<br />
									[Postal Code] [City]
									<br />
									[Country]
								</p>
							</div>

							<div>
								<h3 className="font-heading text-xl font-semibold mb-2 text-foreground">
									Disclaimer
								</h3>
								<h4 className="font-semibold text-foreground mb-2">Liability for Contents</h4>
								<p>
									The contents of our pages have been created with the greatest care. However, we
									cannot guarantee the contents' accuracy, completeness or topicality. As service
									providers, we are liable for our own contents of these websites according to § 7,
									paragraph 1 German Telemedia Act (TMG). However, according to §§ 8 to 10 German
									Telemedia Act (TMG), service providers are not under obligation to permanently
									monitor submitted or stored information or to search for evidences that indicate
									illegal activities. Legal obligations to remove information or to block the use of
									information remain unchallenged. In this case, liability is only possible at the
									time of knowledge about a specific violation of law. Illegal contents will be
									removed immediately at the time we get knowledge of them.
								</p>

								<h4 className="font-semibold text-foreground mb-2 mt-4">Liability for Links</h4>
								<p>
									Our offer includes links to external third party websites. We have no influence on
									the contents of those websites, therefore we cannot guarantee for those contents.
									Providers or administrators of linked websites are always responsible for their
									own contents. The linked websites had been checked for possible violations of law
									at the time of the establishment of the link. Illegal contents were not detected
									at the time of the linking. However, a permanent monitoring of the contents of
									linked websites cannot be imposed without reasonable indications that there has
									been a violation of law. Illegal links will be removed immediately at the time we
									get knowledge of them.
								</p>

								<h4 className="font-semibold text-foreground mb-2 mt-4">Copyright</h4>
								<p>
									Contents and compilations published on these websites by the providers are subject
									to German copyright laws. Reproduction, editing, distribution as well as the use
									of any kind outside the scope of the copyright law shall require the prior written
									consent of the author or originator. Downloads and copies of these websites are
									permitted for private use only. The commercial use of our contents without
									permission of the original author is prohibited. Copyright laws of third parties
									are respected as long as the contents on these websites do not originate from the
									provider. Contributions of third parties on this site are indicated as such.
									However, if you notice any violations of copyright law, please inform us. Such
									contents will be removed immediately.
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
