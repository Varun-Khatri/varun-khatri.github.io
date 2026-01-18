// Carousel functionality for future use
class Carousel {
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.slides = this.container.querySelectorAll('.carousel-slide');
        this.currentIndex = 0;
        this.autoPlay = options.autoPlay || false;
        this.interval = options.interval || 5000;
        this.autoPlayTimer = null;

        this.init();
    }

    init() {
        // Create navigation if not present
        if (!this.container.querySelector('.carousel-nav')) {
            this.createNavigation();
        }

        // Show first slide
        this.showSlide(this.currentIndex);

        // Start autoplay if enabled
        if (this.autoPlay) {
            this.startAutoPlay();
        }

        // Add event listeners for pause on hover
        if (this.autoPlay) {
            this.container.addEventListener('mouseenter', () => this.stopAutoPlay());
            this.container.addEventListener('mouseleave', () => this.startAutoPlay());
        }
    }

    createNavigation() {
        // Create previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-btn carousel-prev';
        prevBtn.innerHTML = '&lsaquo;';
        prevBtn.addEventListener('click', () => this.prevSlide());

        // Create next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-btn carousel-next';
        nextBtn.innerHTML = '&rsaquo;';
        nextBtn.addEventListener('click', () => this.nextSlide());

        // Create dots navigation
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'carousel-dots';

        for (let i = 0; i < this.slides.length; i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot';
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => this.goToSlide(i));
            dotsContainer.appendChild(dot);
        }

        // Create navigation container
        const navContainer = document.createElement('div');
        navContainer.className = 'carousel-nav';
        navContainer.appendChild(prevBtn);
        navContainer.appendChild(dotsContainer);
        navContainer.appendChild(nextBtn);

        this.container.appendChild(navContainer);
    }

    showSlide(index) {
        // Hide all slides
        this.slides.forEach(slide => {
            slide.classList.remove('active');
        });

        // Show current slide
        this.slides[index].classList.add('active');

        // Update dots
        const dots = this.container.querySelectorAll('.carousel-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        this.currentIndex = index;
    }

    nextSlide() {
        let newIndex = this.currentIndex + 1;
        if (newIndex >= this.slides.length) {
            newIndex = 0;
        }
        this.showSlide(newIndex);
    }

    prevSlide() {
        let newIndex = this.currentIndex - 1;
        if (newIndex < 0) {
            newIndex = this.slides.length - 1;
        }
        this.showSlide(newIndex);
    }

    goToSlide(index) {
        if (index >= 0 && index < this.slides.length) {
            this.showSlide(index);
        }
    }

    startAutoPlay() {
        if (this.autoPlayTimer) clearInterval(this.autoPlayTimer);

        this.autoPlayTimer = setInterval(() => {
            this.nextSlide();
        }, this.interval);
    }

    stopAutoPlay() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }
}

// Initialize carousels on page load
document.addEventListener('DOMContentLoaded', function () {
    // Example: Initialize carousel if present
    // const carousel = new Carousel('.carousel-container', {
    //     autoPlay: true,
    //     interval: 5000
    // });

    // Add any additional carousel initialization here
});