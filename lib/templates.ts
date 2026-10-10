export const saasTemplate = `
  <section class="hero p-16 text-center">
    <h1 class="text-5xl font-bold mb-4">{{title}}</h1>
    <p class="text-xl text-zinc-600 mb-8">{{description}}</p>
    <button class="px-8 py-3 bg-zinc-900 text-white rounded-lg">{{cta_text}}</button>
  </section>
  <section class="features grid grid-cols-3 gap-8 p-16">
    <div class="feature text-center"><h3>Feature 1</h3></div>
    <div class="feature text-center"><h3>Feature 2</h3></div>
    <div class="feature text-center"><h3>Feature 3</h3></div>
  </section>
`;

export const webinarTemplate = `
  <section class="hero p-16 text-center">
    <h1 class="text-5xl font-bold mb-4">{{title}}</h1>
    <p class="text-lg text-zinc-500 mb-2">{{date}}</p>
    <p class="text-xl text-zinc-600 mb-8">{{description}}</p>
    <button class="px-8 py-3 bg-zinc-900 text-white rounded-lg">{{cta_text}}</button>
  </section>
  <section class="features grid grid-cols-3 gap-8 p-16">
    <div class="feature text-center"><h3>Agenda 1</h3></div>
    <div class="feature text-center"><h3>Agenda 2</h3></div>
    <div class="feature text-center"><h3>Agenda 3</h3></div>
  </section>
`;
