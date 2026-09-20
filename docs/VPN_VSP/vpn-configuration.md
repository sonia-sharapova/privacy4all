
## Manually configuring and locking down a VPN

**Objective:** configure an OpenVPN connection on Linux and lock the firewall so nothing leaks outside the VPN tunnel.

**Prerequisites:** a Linux machine or VM running a systemd-free distribution. The source material is explicit that this walkthrough assumes systemd is not managing DNS, since systemd-resolved will overwrite the DNS configuration on restart and break this setup. Basic terminal familiarity is assumed.

Step-by-step lab procedure

-   Install the OpenVPN package and its dependency iproute2 using your distro's package manager.
-   Obtain a .conf configuration file from your VPN provider and place it in /etc/openvpn. (The source walkthrough uses RiseUp VPN as its free example: run its generate.sh script, then edit the resulting config file to remove any duplicate "remote" lines.)
-   Install the UFW firewall package.
-   Open the config file and find the "remote" line, which lists the VPN server's IP address and port. Run:

sudo ufw allow out to [SERVER_IP] port [PORT]

-   In the config file, change the "dev tun" line to something identifiable, such as "tun_myvpn," so you can reference it in firewall rules.
-   Run these two commands to allow traffic on the VPN tunnel interface:

sudo ufw allow in on tun_myvpn

sudo ufw allow out on tun_myvpn

-   Find your local router's IP address with sudo ifconfig, and allow it explicitly:

sudo ufw allow out to [LOCAL_ROUTER_IP]

-   Replace your ISP's DNS servers with the VPN's own DNS servers. Run sudo resolvconf -l to see current settings, then edit /etc/resolv.conf to insert the VPN's nameserver (the RiseUp example given is nameserver 172.27.0.1).
-   Make that DNS configuration file immutable so nothing silently overwrites it later, either with chattr +i on the file, or by adding the line nohook resolv.conf wpa_supplicant to /etc/dhcpcd.conf.
-   Allow each VPN DNS server IP through the firewall individually:

sudo ufw allow out to [DNS_SERVER_IP]

-   Lock everything else down by default:

sudo ufw default deny incoming

sudo ufw default deny outgoing

-   Add startup code to /etc/rc.d/rc.local so this firewall configuration is automatically reapplied every time the machine boots.
-   Start the VPN connection with:

cd /etc/openvpn; sudo openvpn [your_config_file.conf]&

Browser leak fix (do this in the same session)

WebRTC, a browser technology, can leak your real IP address even while a VPN is active. In Firefox, disable it by going to about:config and setting media.peerconnection.enabled to false. In Chrome-based browsers, install a WebRTC-blocking extension such as WebRTC Control. Pale Moon users do not need to do anything, since it does not implement WebRTC the same way.

IPv6 leak fix, if needed

If testing (next session) reveals an IPv6 leak, disable IPv6 system-wide: blacklist the IPv6 kernel module from the terminal, then edit /etc/sysctl.conf to add disable rules for all IPv6 interfaces, and apply the change with sudo sysctl -p.

Maintenance note specific to free RiseUp certificates

RiseUp's VPN certificates expire roughly monthly. When the connection stops working, rename your current working config file, run generate.sh again to get a fresh one, copy just the new certificate block (the content between the <ca> tags) out of the new file, paste it into the renamed old file in place of the expired certificate, then delete the newly generated file and rename your edited file back to its original name.
