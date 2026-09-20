
## Glossary

**VPN (virtual private network)**: a service that encrypts your device's traffic and routes it through a provider's server, so websites and your ISP see the provider's server instead of you directly.

**VPS (virtual private server)**: a virtualized slice of a physical server, giving you your own dedicated operating system and resources with full control, at lower cost than a full dedicated server.

**OpenVPN / WireGuard**: two open, independently auditable VPN protocols; contrasted in this plan with closed, proprietary VPN apps.

DNS leak: when your device's domain-lookup requests bypass the VPN tunnel and go to your normal ISP's DNS servers instead of the VPN's, potentially revealing your activity even while otherwise connected.

WebRTC leak: a browser technology that can reveal your real IP address even while a VPN is active, unless specifically disabled or blocked.

Kill switch: a VPN feature (or, as taught in Session 3, a manually configured firewall default) that blocks all internet traffic if the VPN connection drops, preventing accidental exposure.

Split tunneling: a VPN configuration that lets specific sites or apps bypass the VPN tunnel intentionally, useful for sites that block VPN traffic outright.

Multi-hop / double VPN: routing traffic through two VPN servers in different locations for additional protection against timing-based tracking.

Five Eyes: an intelligence-sharing alliance among the US, UK, Canada, Australia, and New Zealand, cited in the source material as a reason some privacy-focused users prefer VPN providers based outside those countries.

Monero: a cryptocurrency designed for stronger transaction privacy than Bitcoin, treated in the source material as a stronger payment-privacy signal for both VPN and VPS providers.