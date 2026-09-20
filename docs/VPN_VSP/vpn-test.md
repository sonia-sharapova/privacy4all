
Testing checklist

-   Close or disable other connections. Before connecting, close all browsers and applications, and disable any network interface (Wi-Fi, cellular) you are not actively using, to reduce the chance of traffic slipping outside the tunnel.
-   Check for leaks. Visit ipleak.net after connecting to check for IP, DNS, and WebRTC leaks in one place.
-   Check your public IP address. You can check it at ipchicken.com, or your VPN provider's own IP-checking page.
-   Check DNS. Run nslookup commands to confirm DNS queries are going through the VPN's DNS servers, not your ISP's.
-   Check the kill switch. Confirm it works by manually disconnecting the VPN process and checking whether your internet access stops immediately.
-   Check isolation. If available, use a network-scanning app like Fing to confirm your device is properly isolated from other devices on the local network while the VPN is active.

Analyze your own traffic with Wireshark

Wireshark is a free, open-source tool that lets you watch your own traffic in real time. It captures each packet's origin, destination, and protocol, and you can sort by bytes to see what is eating up the most time and data. It is a good way to confirm with your own eyes that your traffic is going where you think it is.

**Protect your privates, and keep your information safe from net perverts and lurkers.**