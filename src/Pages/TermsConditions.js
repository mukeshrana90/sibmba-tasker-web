import React, { useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
export default function TermsConditions() {
  const { pathname } = useLocation();

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
              <h3>Terms and Conditions for Simba Tasker</h3>
              <h4>Effective Date: [01/10/2024]</h4>
              <h4>Introduction</h4>
              <p>
                Welcome to Simba Tasker, a platform that connects service
                providers (both verified and unverified) and individuals seeking
                services in Zimbabwe. By using the Simba Tasker platform, you
                agree to comply with and be bound by the following terms and
                conditions, which govern the relationship between Simba Tasker,
                service providers, and customers. These terms ensure all parties
                are covered, protect our interests as an organization, and
                ensure the platform is used responsibly by all users.
              </p>

              <h4>1. Definitions</h4>
              <p>
                <b>Simba Tasker Enterprises Private Limited:</b> The company
                operating the Simba Tasker mobile app and platform.
              </p>
              <p>
                <b>Service Provider: </b>Individuals, businesses, or
                tradespeople who offer services via the Simba Tasker platform.
              </p>

              <p>
                <b>Customer:</b> Individuals seeking services from providers
                through Simba Tasker.
              </p>

              <p>
                <b>Platform:</b> Refers to the Simba Tasker app and website.
              </p>
              <p>
                <b>Subscription Fee:</b> The fee paid by service providers to
                access Simba Tasker's services and customer base.
              </p>

              <p>
                <b>OTP Consent via SMS:</b> By opting in, you agree to receive SMS OTPs for identity verification and secure platform access.
              </p>
              
              <p>
                <b> 2. Acceptance of Terms</b> By creating an account on Simba
                Tasker, both service providers and customers agree to these
                terms and conditions. If you do not agree with any part of these
                terms, you should immediately cease using the platform.
              </p>
              <p>
                <b>3. Scope of Services</b> Simba Tasker provides a platform
                that facilitates the connection between service providers and
                customers.
              </p>
              <h4>Simba Tasker:</h4>
              <p>
                Does not manage or control the execution of services agreed upon
                between the service provider and customer.
              </p>
              <p>
                Is not responsible for the quality, completion, or execution of
                services. Disputes about service execution must be resolved
                between the customer and service provider.
              </p>
              <p>
                Only handles service provider subscriptions and facilitates
                optional payment services on behalf of customers when requested.
              </p>
              <h4>4. Payments and Transactions</h4>
              <p>
                <b> Subscription Fees:</b> Service providers are required to pay
                a subscription fee to use the platform and access its customer
                base. These fees are non-refundable unless otherwise stated.
              </p>
              <p>
                <b> Payment Handling for Services:</b> Simba Tasker offers an
                optional payment processing feature where customers can make
                payments through our platform. Funds will be held in escrow by
                Simba Tasker and released only upon completion of the
                agreed-upon service. The customer is responsible for authorizing
                the release of funds once they are satisfied with the service.
                The customer who uses this option will cover the transfer and
                handling charges levied by various payment platforms in Zimbabwe
                involved in the transfer of funds to the service provider
              </p>
              <h4>
                Simba Tasker does not take responsibility for payments or
                refunds outside of its payment system. If payment is made
                directly between the customer and service provider, Simba Tasker
                is absolved of any responsibility for those transactions.
              </h4>
              <h4>
                5. Service Providers Responsibilities By signing up to Simba
                Tasker, service providers agree to:
              </h4>
              <p>
                <b> Provide accurate and truthful information:</b> Service
                providers must ensure that all information provided, including
                qualifications, business registration, and identification
                documents, is accurate and up-to-date.
              </p>
              <p>
                <b>Perform services as agreed:</b> Providers are responsible for
                delivering services as promised to customers. Failure to perform
                agreed-upon tasks or providing falsified documents may lead to
                consequences under Zimbabwean law.
              </p>
              <p>
                <b>Accountability:</b> Service providers acknowledge that they
                are fully responsible for their actions and performance on the
                platform. Any misconduct, including fraud, non-compliance with
                agreed terms, or breach of contract, can result in:
              </p>
              <h4>Account suspension pending investigation</h4>
              <h4>Permanent removal from the platform</h4>
              <h4>
                Potential legal action, including prosecution under Zimbabwean
                law for severe offences
              </h4>
              <h4>
                6. Customer Responsibilities Customers using Simba Tasker agree
                to:
              </h4>
              <p>
                <b>Provide</b> accurate information when requesting services,
                including clear descriptions of the services needed.
              </p>
              <p>
                <b>Engage</b> in good faith with service providers and provide
                honest feedback and ratings .
              </p>
              <p>
                <b>Payment Authorizations:</b> If paying through Simba Tasker,
                customers are responsible for authorizing the release of funds
                after confirming that the service has been completed to their
                satisfaction .
              </p>
              <p>
                <b>Accountability:</b> Any misuse of the platform by customers,
                including misrepresentation, abuse, or fraudulent claims, may
                result in:
              </p>
              <p>Account suspension pending investigation</p>
              <p>Permanent removal from the platform</p>
              <p>
                Possible prosecution under Zimbabwean law for severe offences.
              </p>
              <h4>
                7. Dispute Resolution In the event of a dispute between a
                customer and service provider:
              </h4>
              <p>
                <b>
                  Both parties are encouraged to resolve the dispute amicably.
                </b>
              </p>
              <p>
                If the dispute cannot be resolved, it should be reported to
                Simba Tasker’s support team. Simba Tasker will investigate the
                matter and, at its discretion, may suspend the accounts of
                involved parties pending resolution.
              </p>
              <p>
                Serious offences or unresolved disputes may result in permanent
                account removal or escalation to legal authorities as per
                Zimbabwean law.
              </p>
              <h4>
                8. Fraud and Misrepresentation Simba Tasker takes fraud and
                misrepresentation seriously. Any service provider found to have
                submitted falsified documents, engaged in fraudulent activities,
                or failed to deliver agreed services will:
              </h4>
              <p>Have their account suspended pending investigation.</p>
              <p>
                Be permanently removed from the platform if found guilty of
                fraud.
              </p>
              <p>
                Face possible legal action, including prosecution under
                Zimbabwean law.
              </p>
              <h4>
                Similarly, customers found guilty of fraud, misrepresentation,
                or abuse of the platform will:
              </h4>
              <p>Have their account suspended</p>
              <p>Face potential prosecution under Zimbabwean law.</p>
              <p>Be permanently removed from Simba Tasker’s platform.</p>
              <h4>9. Account Suspension and Termination</h4>
              <p>
                <b>Temporary Suspension:</b> Simba Tasker reserves the right to
                temporarily suspend accounts under investigation for fraud,
                misconduct, or any violation of these terms. During suspension,
                the user may not have access to their account or the platform's
                services.
              </p>
              <p>
                <b> Permanent Termination:</b> If a user is found guilty of
                severe offences, their account will be permanently deactivated,
                and they will be barred from future use of the Simba Tasker
                platform.
              </p>
              <p>
                <b>Service Providers:</b> Any provider whose account is
                permanently terminated will forfeit any subscription fees paid,
                and their profile will be permanently removed from the platform.
              </p>
              <p>
                <b>Customers:</b> Any customer permanently banned will lose
                access to any ongoing or future services booked through the
                platform.
              </p>
              <h4>
                10. Legal Compliance All users of Simba Tasker agree to comply
                with all applicable laws in Zimbabwe, including but not limited
                to:
              </h4>
              <p>Consumer protection laws</p>
              <p>Data protection laws</p>
              <p>Laws governing service delivery and business practices</p>
              <p>
                Service providers must ensure that their services comply with
                all relevant Zimbabwean laws and regulations. Any legal
                violations will result in immediate account suspension and may
                lead to legal proceedings.
              </p>
              <h4>
                11. Limitation of Liability Simba Tasker, as a platform, is not
                liable for:
              </h4>
              <p>
                The quality or completion of services rendered by providers.
              </p>
              <p>
                Any disputes arising from service contracts between customers
                and service providers.
              </p>
              <p>
                Any financial loss, injury, or damages caused by the actions or
                inactions of service providers or customers.
              </p>
              <p>
                Simba Tasker’s responsibility is limited to providing the
                platform for connection and, where requested, handling payments
                through its system.
              </p>
              <h4>
                12. Data Privacy and Security Simba Tasker is committed to
                protecting your personal information.
              </h4>
              <p>
                Please refer to our{" "}
                <a href="https://simbatasker.com/privacy-policy">
                  Privacy Policy
                </a>{" "}
                for details on how we collect, use, and safeguard your data. By
                using Simba Tasker, you agree to our privacy practices.
              </p>
              <p>
                <b>13. Changes to Terms and Conditions </b> Simba Tasker
                reserves the right to update or modify these terms and
                conditions at any time. Users will be notified of any
                significant changes through email or in-app notifications.
                Continued use of the platform after changes have been made
                constitutes acceptance of the new terms.
              </p>
              <h4>
                14. Agreement By registering for and using Simba Tasker, both
                service providers and customers agree to be bound by these terms
                and conditions. Users acknowledge that they understand their
                rights and responsibilities under Zimbabwean law and agree to
                abide by the platform’s rules.
              </h4>
              <p>
                If you have any questions or concerns about these Terms and
                Conditions, please contact us at:
              </p>

              <p>
                Phone numbers: <br />
                +263777002459 <br />
                +263777003708 <br />
                +263777006775
              </p>

              <p>Contact Information</p>
              <p>
                Email:{" "}
                <a href="mailto:info@simbatasker.com">info@simbatasker.com</a>
                <br />
                <a href="mailto:admin@simbatasker.com">admin@simbatasker.com</a>
                <br />
                <a href="mailto:supports@simbatasker.com">
                  supports@simbatasker.com
                </a>
                <br />
                <a href="mailto:accounts@simbatasker.com">
                  accounts@simbatasker.com
                </a>
              </p>

              <p>Address: Offices 205 sandton park westgate harare Zimbabwe</p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
