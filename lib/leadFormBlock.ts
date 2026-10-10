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
      </div>
      <script>
        (function() {
          var form = document.getElementById('nexus-lead-form');
          if (!form) return;
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            var formData = new FormData(form);
            var data = {
              name: formData.get('name'),
              email: formData.get('email'),
              source: 'site',
              siteId: 'site_123'
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
                if (thankYou) {
                  thankYou.style.display = 'block';
                }
              } else {
                alert('Submission failed. Please try again.');
              }
            } catch (err) {
              console.error('Submission error:', err);
              alert('An error occurred.');
            }
          });
        })();
      </script>
    `,
  });
}
