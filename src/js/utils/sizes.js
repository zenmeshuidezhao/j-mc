import emitter from '../event/event-bus.js';

export default class Sizes {
    constructor() { 
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.aspect = this.width / this.height;
        this.pixelRatio = window.devicePixelRatio || 2;

        this._resizeHandler = () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.pixelRatio = window.devicePixelRatio || 2;

            emitter.emit('core:resize', {
                width: this.width,
                height: this.height,
                pixelRatio: this.pixelRatio
            })
        }

        window.addEventListener('resize', this._resizeHandler);
    }

    destroy() {
        window.removeEventListener('resize', this._resizeHandler);
    }
}