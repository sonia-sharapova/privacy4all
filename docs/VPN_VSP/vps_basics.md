
## VPN Basics

A practical primer on how VPNs work, who is watching you online, how to pick a provider you can actually trust, and how to set one up and test it yourself.

Who's watching you online?

Every time you get on the internet, you are not alone. Before we talk about how to protect yourself, it helps to know who is actually watching. When you access the internet, you might be observed by:

-   Your Wi-Fi network operator, whoever runs the network you are connected to
-   Your Internet Service Provider, or ISP (Optimum, Verizon, and the like)
-   Lawful interception, meaning government or law enforcement requests
-   Unlawful interception, meaning hackers and other net perverts who want your data

The uncomfortable truth: you are always being watched. Network privacy is not only about digital protection. It can extend to your physical safety too, because an unencrypted connection can leak your IP address, and your IP address can reveal your physical location.

A quick tell: look at the start of a web address. HTTP versus HTTPS, where the S stands for secure. You want the S. It means the connection between you and that site is encrypted.

Does privacy even matter anymore? Yes, and the earlier you start hiding yourself, the better. On the internet, companies and corporations are waiting to consume you. Learn to trust yourself over the vague "best practices" you find floating around online.

### What is a VPN?

A VPN (virtual private network) creates an encrypted tunnel between your device and a server run by the VPN provider. Think of it like putting on a shield before walking into enemy territory. You do not know what will come your way, but you keep yourself covered.

In plain English:

-   Normally: You → Website (the website sees your IP)
-   With a VPN: You → VPN Server → Website (the website sees the VPN's IP, not yours)

Put another way, a VPN connects you to another computer somewhere else in the world through an encrypted tunnel, and you borrow that computer's IP address instead of the one your ISP handed you. It is a little like using a friend's address to get your kids into a better school district, except here the "friend" is usually a stranger you are paying.

Example: normally, typing google.com sends your request straight to Google's servers. With a VPN active, your request goes to the VPN provider's servers first, and those servers relay it to Google. The same logic applies to any site, including ones that might be blocked or restricted where you live.

Your data and activity are still being recorded somewhere. What the encryption buys you is that it becomes much harder to link that activity back to you.

### What a VPN does

-   Hides your browsing from your ISP, who then see only encrypted traffic.
-   Changes your apparent location by connecting to servers elsewhere.
-   Lets you reach geo-restricted services, like a US-only Netflix catalog, by connecting to a server in that country.
-   Lets you download torrents in places where torrent traffic is blocked outright or deliberately slowed by the ISP.
-   Lets you reach websites blocked in your country, because your traffic appears to come from wherever the VPN server sits.
-   Makes your information harder to read, which makes you a less inviting target for fraud.
-   Protects you while traveling, when you may not know the local laws or policies and do not want to paint a target on your back by accessing restricted material.

### What a VPN does NOT do

-   **Activity:** your VPN provider CAN see your activity. You are shifting trust from your ISP to your VPN provider, so choose wisely.
-   **Anonymity:** a VPN does NOT make you anonymous. It makes you private from your ISP, not from the VPN provider.
-   **Watch the speed:** if your VPN suddenly crawls, treat it as a warning sign. Slow VPN traffic can mean someone is poking at your data, and it may no longer be safe to use.

### Proxies, and how they differ

A proxy is another machine that we give permission to access the internet on our behalf. It fetches things for you, so the destination sees the proxy instead of you. A VPN is like a proxy with armor: it wraps the whole connection in an encrypted tunnel, not just a single request.

Fun fact: Facebook started out unencrypted. It now uses HTTPS. So while Facebook the company can still see everything you say and do on it, your Wi-Fi operator and your ISP cannot. That information stays between you, the person you are talking to, and Facebook.

DNS, the internet's phonebook

DNS (Domain Name System) is like a phonebook for the internet. It matches human-friendly names like google.com to the numeric IP addresses that computers actually use, and it keeps track of those addresses as they change.

That phonebook is also a weak point. In a "side channel attack," a snoop does not break your proxy or VPN directly. Instead they watch your DNS lookups to work out where you are going. This is why one layer is never enough. You have to stack several lines of defense so that you and your information stay safe, especially if you are doing anything the least bit sensitive, whether as a proxy user or a proxy operator.

#### Legal note

VPNs are legal in most countries but restricted in places like Iran, Russia, China, and Turkey. Check your local laws.

Choosing a trustworthy VPN provider

Not all VPNs are equal, and a lot of VPN marketing is misleading. Before you trust one, ask three simple questions: Is it reliably accessible? Does it log what you do? And is it self-hosted or run by a trustworthy non-profit? If a VPN logs everything, there is no real difference between it and your ISP.

### Checklist of good signs

-   The provider has survived a real police raid or legal seizure of its servers, and no usable logs were recovered (cited examples: Mullvad, ExpressVPN).
-   It accepts cash-equivalent or cryptocurrency payment and does not require personal information to create an account.
-   It supports open, auditable protocols, specifically OpenVPN and/or WireGuard, rather than forcing you into a closed, proprietary app.
-   It publishes transparency reports and clear, specific answers about server locations, rather than inflated "virtual server" counts.
-   It offers a genuine, well-documented kill switch that blocks all traffic if the VPN connection drops.
-   It owns or directly controls its server hardware (bare metal, sometimes running entirely in RAM) rather than only renting virtual servers from third parties.

#### A note on no-log VPNs

A "no-log" (non-logging) VPN promises not to record your activity. The catch is that anyone can claim it, so look for proof: independent audits, and ideally a real police raid that came up empty. Mullvad is the standout, with more than ten independent audits and a Swedish police raid that seized nothing because there was nothing to seize. The notes behind this guide also mention VyprVPN and TunnelBear as non-logging options. Treat those with more caution: TunnelBear is best used only for its free tier, and any no-log claim is only worth as much as the audit behind it.

## Providers with good reviews

**Mullvad** https://mullvad.net/en

-   No personal information needed, random account numbers, accepts Amazon scratch cards, open-source client, has a "Local Network Sharing" feature, and has moved from OpenVPN to WireGuard.
-   One Reddit post argues it is overrated: https://www.reddit.com/r/vpnreviews/comments/1hurluo/mullvad_vpn_is_overrated/

**IVPN** https://www.ivpn.net/en/

-   No personal information required, custom DNS support, multi-hop capability, open-source software, published server status, and a documented kill switch.

**ProtonVPN** https://protonvpn.com/

-   Employee-owned, offers multi-hop "Secure Core" servers and a Tor-over-VPN option, and uses diskless servers, though it scored poorly on one location-honesty test cited in the source.

**Windscribe** https://windscribe.com/

-   Honest marketing, a DNS-based ad and tracker blocking feature called R.O.B.E.R.T, and a responsive security team.

Providers and patterns flagged as risky

-   **NordVPN:** has routed traffic through residential IPs from questionable sources and lacks transparency reporting.
-   **ExpressVPN and CyberGhost:** both owned by Kape Technologies, a company with a past tied to malware distribution.
-   **Google's built-in VPN:** permanently changes Windows DNS settings.
-   **Free VPNs in general,** with the exception of the limited free tiers offered by ProtonVPN, TunnelBear, and Windscribe. RiseUp is another fully free VPN with positive reviews.

### Using a self-hosted VPN on a VPS

You can rent a VPS and install VPN server software on it yourself, effectively becoming your own VPN provider. Doing this is a technical, legal, and political decision all at once, so go in with your eyes open. If you want to set up the server itself, see the companion VPS self-hosting guide.

**The downside, more traceable:** a self-hosted VPN on a personally rented VPS gives you a single IP address used only by you. Commercial VPN providers use shared server IPs that mix many users' traffic, which makes it hard to link specific activity back to any one person.

So it is a trade-off. Rolling your own gives you control. A good commercial VPN gives you a crowd to hide in.

Higher levels of protection

A VPN is a solid shield, but it is not the only one.

-   **Algo:** an open-source toolkit that helps you stand up your own private VPN server quickly, so you are not trusting anyone else's.
-   **Tor (The Onion Router):** triple-encrypted. Your traffic bounces through three separate computers before it reaches its destination, which makes tracing it back to your real machine extremely difficult. A regular VPN just swaps your IP for one other IP; Tor wraps it in three layers.

Ports, the internet's "little doors"

Networks talk to each other through ports, which you can picture as little doors. Different doors carry different kinds of traffic, so a different port usually means a different protocol.

This matters for VPNs. OpenVPN can be told to run on almost any port, including the same one that ordinary secure web traffic uses. Configured that way, activity like torrenting can blend in and look a lot like plain web browsing to anyone watching from the outside.