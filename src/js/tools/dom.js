export function detectDeviceType() {
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        navigator.userAgent.toLowerCase()
    ) ? 'mobile' : 'desktop';
}