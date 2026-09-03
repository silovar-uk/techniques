(() => {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function techniqueAwareFetch(input, init) {
    const requestUrl = typeof input === 'string' ? input : input?.url;
    const target = new URL(requestUrl || '', window.location.href);

    if (!target.pathname.endsWith('/data/techniques.json')) {
      return nativeFetch(input, init);
    }

    const baseResponse = await nativeFetch(input, init);
    if (!baseResponse.ok) return baseResponse;

    try {
      const additionResponse = await nativeFetch('data/techniques-additions.json', { cache: 'no-store' });
      if (!additionResponse.ok) return baseResponse;

      const [baseTechniques, additions] = await Promise.all([
        baseResponse.clone().json(),
        additionResponse.json()
      ]);

      return new Response(JSON.stringify([...baseTechniques, ...additions]), {
        status: baseResponse.status,
        statusText: baseResponse.statusText,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      });
    } catch (error) {
      console.warn('Technique additions could not be loaded; using base dataset.', error);
      return baseResponse;
    }
  };
})();
