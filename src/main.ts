// Font loading detection
function initFontLoading(): void {
  if (document.fonts) {
    document.fonts
      .ready.then(() => {
        document.documentElement.classList.add('fonts-loaded');
      })
      .catch(() => {
        document.documentElement.classList.add('fonts-failed');
      });

    // Fallback timeout
    setTimeout(() => {
      if (!document.documentElement.classList.contains('fonts-loaded')) {
        document.documentElement.classList.add('fonts-failed');
      }
    }, 3000);
  } else {
    document.documentElement.classList.add('fonts-loaded');
  }
}

// Generate constellation nodes
function initConstellationGrid(): void {
  const grid = document.querySelector('.constellation-grid');
  if (!grid) return;

  const nodeCount = 20;

  for (let i = 0; i < nodeCount; i++) {
    const node = document.createElement('div');
    node.className = 'constellation-node';
    node.style.left = Math.random() * 100 + '%';
    node.style.top = Math.random() * 100 + '%';
    node.style.animationDelay = `${Math.random() * 2}s, ${Math.random() * 4}s`;
    grid.appendChild(node);
  }
}

// Intersection Observer for scroll animations
function initScrollAnimations(): void {
  const observerOptions: IntersectionObserverInit = {
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, observerOptions);

  document.querySelectorAll<HTMLElement>('.service-card').forEach((card) => {
    observer.observe(card);

    // Track mouse position for glow effect
    card.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });
}

// Turnstile token storage
let turnstileToken: string | null = null;

// Global callback for Turnstile
(window as unknown as { onTurnstileVerify: (token: string) => void }).onTurnstileVerify = (token: string) => {
  turnstileToken = token;
};

// Waitlist form submission
function initWaitlistForm(): void {
  const waitlistForm = document.getElementById('waitlist-form') as HTMLFormElement | null;
  if (!waitlistForm) return;

  waitlistForm.addEventListener('submit', async (e: Event) => {
    e.preventDefault();

    const button = waitlistForm.querySelector('button') as HTMLButtonElement;
    const message = waitlistForm.querySelector('.waitlist-message') as HTMLParagraphElement;
    const emailInput = waitlistForm.querySelector('input[name="email"]') as HTMLInputElement;
    const email = emailInput.value;

    if (!turnstileToken) {
      message.className = 'waitlist-message error';
      message.textContent = 'Please complete the verification.';
      return;
    }

    button.classList.add('loading');
    button.disabled = true;
    message.className = 'waitlist-message';
    message.textContent = '';

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken }),
      });

      const data = await res.json();

      if (res.ok) {
        message.className = 'waitlist-message success';
        message.textContent = "You're on the list. We'll be in touch.";
        emailInput.value = '';
        // Reset Turnstile for next submission
        turnstileToken = null;
        if (typeof turnstile !== 'undefined') {
          turnstile.reset();
        }
      } else {
        message.className = 'waitlist-message error';
        message.textContent = data.error || 'Something went wrong. Try again.';
      }
    } catch {
      message.className = 'waitlist-message error';
      message.textContent = 'Connection failed. Try again.';
    } finally {
      button.classList.remove('loading');
      button.disabled = false;
    }
  });
}

// Declare turnstile global
declare const turnstile: { reset: () => void } | undefined;

// Solar system mouse interaction
function initSolarSystem(): void {
  const solarSystem = document.getElementById('solar-system');
  if (!solarSystem) return;

  const heroVisual = solarSystem.parentElement;
  if (!heroVisual) return;

  heroVisual.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = heroVisual.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / rect.width;
    const deltaY = (e.clientY - centerY) / rect.height;

    const tiltX = deltaY * 15;
    const tiltY = deltaX * -15;

    solarSystem.style.transform = `translate(-50%, -50%) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  });

  heroVisual.addEventListener('mouseleave', () => {
    solarSystem.style.transform = 'translate(-50%, -50%) rotateX(0deg) rotateY(0deg)';
  });
}

// Initialize everything
initFontLoading();

document.addEventListener('DOMContentLoaded', () => {
  initConstellationGrid();
  initScrollAnimations();
  initWaitlistForm();
  initSolarSystem();
});
