import React, { useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
export default function PrivacyPolicy() {
  const location = useLocation();
  useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [location.pathname]);
  return (
    <div>
      <section className="page-mt pt-5">
        <Container>
          <div class="container">
            <div class="privacy_text">
              <div class="header-logo text-center">
                <Link class="main-logo link" to="/">
                  <img src={require("../../src/Assets/Images/logo-update.svg").default} />
                </Link>
              </div>
              <div class="privacy_text">
                <h3>Privacy Policy for Simba Tasker</h3>
                <h4>Effective Date: [01/10/2024]</h4>
                <p>
                  Introduction Simba Tasker is committed to protecting the
                  privacy of all users, including service providers, businesses,
                  and those seeking services on our platform. This Privacy
                  Policy outlines how we collect, use, disclose, and protect
                  your personal information in compliance with Zimbabwean data
                  protection laws and regulations. By using our platform, you
                  agree to the terms of this Privacy Policy.
                </p>

                <h4>
                  1. Information We Collect We collect personal information from
                  users to facilitate seamless connections between service
                  providers and customers, while ensuring security and
                  reliability. The information collected falls into the
                  following categories:
                </h4>
                <p>Personal Identifiable Information (PII):</p>
                <p>
                  Name, contact details (email, phone number),
                  residential/business address
                </p>

                <p>
                  Identity information (e.g., national ID or business
                  registration number)
                </p>

                <p>
                  Payment information (e.g., credit card details, mobile money
                  details)
                </p>

                <h4>Service-related Information:</h4>
                <p>
                  Service preferences, ratings, feedback, transaction history
                </p>
                <p>
                  Location data (to match you with service providers in your
                  area)
                </p>

                <h4>Device Information:</h4>

                <p>
                  IP address, browser type, operating system, device identifiers
                </p>

                <h4>
                  2. How We Use Your Information The information collected from
                  our users is used for the following purposes:
                </h4>

                <p>
                  To Provide Our Services: We use personal data to link service
                  providers with those seeking services, matching them based on
                  location, type of service, and user preferences.
                </p>
                <p>
                  To Enhance User Experience: We use feedback and ratings to
                  improve our platform and service offerings, helping users make
                  informed choices.
                </p>
                <p>
                  For Security and Fraud Prevention: We use identity and payment
                  information to verify users and reduce the risk of fraud,
                  ensuring all transactions on Simba Tasker are secure.
                </p>

                <p>
                  To Communicate with You: We may use your contact information
                  to send updates, service alerts, and promotional offers
                  related to Simba Tasker.
                </p>
                <p>
                  To Comply with Legal Requirements: In cases where the law
                  requires, we may share your information with legal
                  authorities, in compliance with Zimbabwean law.
                </p>

                <h4>
                  3. Data Sharing and Disclosure Simba Tasker is committed to
                  not sharing, selling, or renting your personal information to
                  third parties without your consent, except under the following
                  circumstances:
                </h4>
                <p>
                  With Your Consent: We will share your data with third parties
                  only when you explicitly agree to it.
                </p>
                <p>
                  With Service Providers: We may share necessary information
                  with our third-party service providers who assist in
                  delivering our services, such as payment processing,
                  analytics, and customer support. All service providers are
                  bound by strict confidentiality agreements.
                </p>
                <p>
                  <b>Legal Obligations</b>: We may disclose your information if
                  required by law, in response to a court order, or to protect
                  the rights, property, or safety of Simba Tasker, our users, or
                  others.
                </p>

                <h4>
                  4. Data Security Simba Tasker employs robust security measures
                  to protect your data from unauthorized access, alteration,
                  disclosure, or destruction. These measures include:
                </h4>
                <p>
                  <b>Encryption:</b> We use encryption protocols for data
                  transmission, including sensitive payment and identity
                  information
                </p>
                <p>
                  <b>Access Control:</b> Access to user data is restricted to
                  authorized personnel who require it to perform their duties.
                </p>
                <p>
                  <b> Regular Audits:</b> We conduct regular security audits and
                  vulnerability assessments to ensure data protection is up to
                  date.
                </p>
                <p>
                  <b>User Responsibility:</b> Users are responsible for
                  maintaining the confidentiality of their passwords and account
                  information.
                </p>
                <h4>
                  5. Retention of Data We retain personal information for as
                  long as it is necessary to fulfill the purposes for which it
                  was collected. In certain cases, we may retain data longer to
                  comply with legal obligations, resolve disputes, or enforce
                  our agreements.
                </h4>
                <p>
                  <b>Inactive Accounts:</b> Inactive user accounts will be
                  deleted after 30 Days of inactivity unless there are pending
                  transactions or legal obligations.
                </p>
                <h4>
                  6. Your Rights as a User Under Zimbabwean law, you have
                  several rights concerning your personal data:
                </h4>
                <p>
                  <b>Access:</b> You have the right to request access to your
                  personal data.
                </p>
                <p>
                  <b>Correction:</b> You can request correction or updates to
                  inaccurate or incomplete data.
                </p>
                <p>
                  <b>Deletion:</b> You may request the deletion of your data
                  when it is no longer needed or when you withdraw consent
                  (except where retention is required by law).
                </p>
                <p>
                  <b>Object:</b> You can object to the processing of your data
                  for specific purposes, such as marketing.
                </p>
                <p>
                  <b>To exercise these rights, please contact us at:</b>{" "}
                </p>

                <p>
                  Phone numbers: <br />
                  +263777002459 <br />
                  +263777003708 <br />
                  +263777006775
                </p>

                <h4>
                  7. Cookies and Tracking Technologies Simba Tasker uses cookies
                  and similar tracking technologies to enhance user experience
                  and gather analytics. By using our platform, you agree to the
                  use of cookies for the following purposes:
                </h4>
                <p>
                  <b>Functional Cookies:</b> Necessary for the platform’s core
                  functionality.
                </p>
                <p>
                  <b>Analytics Cookies:</b> Used to gather data on user
                  behaviour, helping us improve the app
                </p>
                <p>
                  <b>Advertising Cookies:</b> May be used to serve relevant ads.
                </p>

                <h4>
                  You can manage or disable cookies in your browser settings,
                  but doing so may limit the platform's functionality.
                </h4>
                <p>
                  <b>8. Children’s Privacy</b> Simba Tasker is not intended for
                  use by individuals under the age of 18 without parental
                  consent. We do not knowingly collect or store personal
                  information from children. If you believe we have collected
                  information from a minor, please contact us, and we will take
                  appropriate action to remove it.
                </p>
                <p>
                  <b>9. Third-Party Links</b> Our platform may contain links to
                  third-party websites. This Privacy Policy applies solely to
                  data collected on Simba Tasker, and we are not responsible for
                  the privacy practices of third-party sites. We encourage you
                  to review the privacy policies of any external websites you
                  visit.
                </p>
                <p>
                  <b>10. Updates to this Privacy</b> Policy We may update this
                  Privacy Policy from time to time to reflect changes in our
                  services or legal requirements. Any updates will be
                  communicated to users through email or an in-app notification.
                  Your continued use of Simba Tasker after any such changes
                  signifies your acceptance of the updated policy.
                </p>
                <p>
                  <b>11. Dispute Resolution</b> Any disputes arising from this
                  Privacy Policy will be resolved in accordance with Zimbabwean
                  law. Users agree to first attempt resolution through informal
                  negotiation before escalating to formal legal proceedings.
                </p>
                <h4>
                  12. Agreement to Terms By using Simba Tasker, you agree to the
                  terms outlined in this Privacy Policy. If you do not agree
                  with any aspect of this policy, you must discontinue using the
                  platform immediately.
                </h4>

                <p>
                  Contact Information For any questions or concerns about this
                  Privacy Policy or how your information is handled, please
                  contact us at:
                </p>

                <p>
                  Email:{" "}
                  <a href="mailto:info@simbatasker.com">info@simbatasker.com</a>
                  <br />
                  <a href="mailto:admin@simbatasker.com">
                    admin@simbatasker.com
                  </a>
                  <br />
                  <a href="mailto:supports@simbatasker.com">
                    supports@simbatasker.com
                  </a>
                  <br />
                  <a href="mailto:accounts@simbatasker.com">
                    accounts@simbatasker.com
                  </a>
                </p>
                <p>
                  Address: Offices 205 sandton park westgate harare Zimbabwe
                </p>
                <p>
                  This comprehensive Privacy Policy ensures that Simba Tasker's
                  interests are protected, and it is in compliance with
                  Zimbabwean data protection laws. It also safeguards the
                  privacy of both service providers and customers, creating a
                  secure and trustworthy environment on the platform.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
