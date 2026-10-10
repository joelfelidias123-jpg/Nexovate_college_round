import type { Editor } from 'grapesjs';

export function registerLeadFormBlock(editor: Editor) {
  const bm = editor.Blocks;

  bm.add('lead-form-block', {
    label: 'Lead Form',
    category: 'Forms',
    content: `
      <div class="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto my-4 border">
        <h3 class="text-xl font-bold mb-4 text-zinc-900">Subscribe for Updates</h3>
        <form id="nexus-lead-form" class="flex flex-col gap-4">
          <div>
            <label class="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input type="text" name="name" required class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900" placeholder="John Doe" />
          </div>
          <div>
            <label class="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input type="email" name="email" required class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900" placeholder="john@example.com" />
          </div>
          <button type="submit" class="w-full py-2 px-4 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors font-medium">
            Submit
          </button>
        </form>
        <div id="nexus-thank-you" style="display: none;" class="text-center py-6 text-emerald-600 font-semibold">
          Thank you for signing up!
        </div>
        <div id="nexus-error" style="display: none;" class="text-center py-3 text-red-600 text-sm font-medium">
          Submission failed. Please try again.
        </div>
      </div>
      <script>
        (function() {
          var form = document.getElementById('nexus-lead-form');
          if (!form) return;
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            var errorEl = document.getElementById('nexus-error');
            if (errorEl) {
              errorEl.style.display = 'none';
              errorEl.textContent = 'Submission failed. Please try again.';
            }

            var formData = new FormData(form);
            var data = {
              name: formData.get('name'),
              email: formData.get('email'),
              source: 'SITE'
            };

            try {
              var res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });

              if (res.ok) {
                form.style.display = 'none';
                var thankYou = document.getElementById('nexus-thank-you');
                if (thankYou) thankYou.style.display = 'block';
              } else if (res.status === 400) {
                var json = await res.json().catch(function() { return null; });
                var message = (json && (json.error || json.message)) ? (json.error || json.message) : 'Invalid input. Please check your details.';
                if (errorEl) {
                  errorEl.textContent = message;
                  errorEl.style.display = 'block';
                }
              } else {
                if (errorEl) {
                  errorEl.textContent = 'Submission failed. Please try again.';
                  errorEl.style.display = 'block';
                }
              }
            } catch (err) {
              console.error('Submission error:', err);
              if (errorEl) {
                errorEl.textContent = 'Submission failed. Please try again.';
                errorEl.style.display = 'block';
              }
            }
          });
        })();
      </script>
    `,
  });
}
