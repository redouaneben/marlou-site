export function getGithubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !owner || !repo) {
    throw new Error(
      "Configuration GitHub manquante. Ajoutez GITHUB_TOKEN, GITHUB_OWNER et GITHUB_REPO dans Netlify."
    );
  }

  return { token, owner, repo, branch };
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export async function getFileSha(path) {
  const { token, owner, repo, branch } = getGithubConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;

  const response = await fetch(url, { headers: githubHeaders(token) });
  if (response.status === 404) return null;

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Impossible de lire ${path} sur GitHub (${response.status}) : ${details}`);
  }

  const payload = await response.json();
  return payload.sha;
}

export async function writeFile(path, buffer, message) {
  const { token, owner, repo, branch } = getGithubConfig();
  const sha = await getFileSha(path);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body = {
    message,
    content: Buffer.from(buffer).toString("base64"),
    branch,
  };

  if (sha) body.sha = sha;

  const response = await fetch(url, {
    method: "PUT",
    headers: githubHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Impossible d'enregistrer ${path} (${response.status}) : ${details}`);
  }

  return response.json();
}
