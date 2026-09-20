
## VPN BASICS

### What is a VPN?

A VPN (virtual private network) creates an encrypted tunnel between your device and a server run by the VPN provider.

  

In plain English:

-   Normally: You → Website (website sees your IP)
    
-   With VPN: You → VPN Server → Website (website sees VPN's IP, not yours)
    

Example: normally, typing google.com sends your request straight to Google's servers. With a VPN active, your request goes to the VPN provider's servers first, and those servers relay it to Google. The same logic applies to any site, including ones that might be blocked or restricted where the learner lives.

What a VPN Does

1. Hides your browsing from your ISP (they only see encrypted traffic)

2. Changes your apparent location (by connecting to servers elsewhere)

1.  Browsing: 1. Hides your browsing from your ISP (they only see encrypted traffic)
    
2.  Geo-Restricted services – Accessing geo-restricted streaming or content services (like a US-only Netflix catalog) by connecting to a server in that country.
    
3.  Torrents: Downloading torrents in places where torrent traffic is blocked outright or deliberately slowed down by the ISP.
    
4.  Accessing websites blocked in your country, because your traffic appears to come from wherever the VPN server is located.
    

  
  

What a VPN Does NOT Do

-   Activity: Your VPN provider CAN see your activity. You're shifting trust from your ISP to your VPN provider. Choose wisely..
    
-   Anonymity: A VPN does NOT make you anonymous. It makes you private from your ISP, but not from the VPN provider.
    

  

Legal Note

VPNs are legal in most countries but restricted in Iran, Russia, China, and Turkey. Check your local laws.

## Choosing a Trustworthy VPN Provider

Not all VPNs are equal, and a lot of VPN marketing is misleading.

### Checklist of good signs

1.  The provider has survived a real police raid or legal seizure of its servers and no usable logs were recovered (cited examples: Mullvad, ExpressVPN).  
      
    
2.  It accepts cash-equivalent or cryptocurrency payment and doesn't require personal information to create an account.  
      
    
3.  It supports open, auditable protocols, specifically OpenVPN and/or WireGuard, rather than forcing you to use a closed, proprietary app.  
      
    
4.  It publishes transparency reports and clear, specific answers about server locations (rather than inflated "virtual server" counts).  
      
    
5.  It offers a genuine, well-documented kill switch that blocks all traffic if the VPN connection drops.
    
6.  It owns or directly controls its server hardware (bare metal, sometimes running entirely in RAM) rather than only renting virtual servers from third parties.  
      
    

### Providers with good reviews

Mullvad:[https://mullvad.net/en](https://mullvad.net/en)

-   no personal information needed, random account numbers, accepts Amazon scratch cards, open-source client, has a "Local Network Sharing" feature, moved from OpenVPN to WireGuard.
    
-   This (https://www.reddit.com/r/vpnreviews/comments/1hurluo/mullvad_vpn_is_overrated/) reddit post, however, disagrees.
    

IVPN: [https://www.ivpn.net/en/](https://www.ivpn.net/en/)

-   no personal information required, custom DNS support, multi-hop capability, open-source software, published server status, documented kill switch.
    

ProtonVPN: [https://protonvpn.com/?srsltid=AfmBOoqdlUsuwKqalrHdbYye9Dtt5zpunJko83nBdkZNVUo1vna0pOmb](https://protonvpn.com/?srsltid=AfmBOoqdlUsuwKqalrHdbYye9Dtt5zpunJko83nBdkZNVUo1vna0pOmb)

-   employee-owned, offers multi-hop "Secure Core" servers and a Tor-over-VPN option, uses diskless servers, though it scored poorly on one location-honesty test cited in the source.
    

Windscribe: [https://windscribe.com/](https://windscribe.com/)

-   honest marketing, a DNS-based ad/tracker blocking feature called R.O.B.E.R.T, and a responsive security team.
    

### Providers and patterns flagged as risky

NordVPN: has routed traffic through residential IPs from questionable sources and lacks transparency reporting.

ExpressVPN and CyberGhost: both owned by Kape Technologies, a company with a past tied to malware distribution.

Google's built-in VPN: permanently changes Windows DNS settings.

Free VPNs in general, with the exception of the limited free tiers offered by ProtonVPN, TunnelBear, and Windscribe. RiseUp is another fully free VPN with positive reviews.

  

## Using self-hosted VPN and VPS

You technically can rent a VPS and install VPN server software on it themselves, effectively becoming your own VPN provider.

downside:

More traceable:

Self Hosted VPN on a personally rented VPS gives you a single IP address used only by you. Commercial VPN providers use shared server IPs that mix many users’ traffic, making it hard to link specific activity back to you.

Commercial VPNs give you crowd anonymity