// Downloads every De Anza's professor from Rate My Professor and saves them on the browser

//RMP's login request code
//It can change anytime since RMP updates it
//This is the source code so you can replace it IF the extension is not working
//If extension start failing, open
//ratemyprofessors.com, press F12, click Network, and copy the current
// "Authorization" header from any request and paste it after Basic
const LOGIN = "Basic dGVzdDp0ZXN0";

const SCHOOL = "U2Nob29sLTE5Njc="; //De Anza's school ID on RMP(Rate My Professor)


// Asks RMP for one batch of professors
//"after" tells the server where the last batch stops
async function getOneBatch(after) {
    const response = await fetch("https://www.ratemyprofessors.com/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": LOGIN
        },
    body: JSON.stringify({
      query: `
        query($school: ID!, $after: String) {
          newSearch {
            teachers(query: { schoolID: $school }, first: 500, after: $after) {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  legacyId
                  firstName
                  lastName
                  department
                  avgRating
                  numRatings
                }
              }
            }
          }
        }`,
      variables: { school: SCHOOL, after: after }
    })
  });

  const json = await response.json();
  return json.data.newSearch.teachers;
}

//Download professor list from RMP
async function downloadEveryone() {
  const professors = {};
  let after = null;
  let count = 0;

  while (true) {
    const batch = await getOneBatch(after);
    for (const edge of batch.edges) {
      const teacher = edge.node;
      if (!teacher.numRatings) continue; //skip professors with no rating
      //Some professors have a middle name in RMP. This keeps the only first
      //word of the first name and the last word of the last name which elimates middle names
      const first = teacher.firstName.trim().split(" ")[0];
      const last = teacher.lastName.trim().split(" ").pop();
      const name = (first + " " + last).toUpperCase();

      professors[name] = {
        id: teacher.legacyId,
        rating: teacher.avgRating,
        reviews: teacher.numRatings,
        department: teacher.department,
      };
      count++;
    }
    console.log("Downloaded " + count + " professors so far");
    if(!batch.pageInfo.hasNextPage) break;
    after = batch.pageInfo.endCursor;

  }
  await chrome.storage.local.set({professors: professors});
  console.log("Saved " + count + " professors.");
  return count;
}

//sending list to content.js
chrome.runtime.onMessage.addListener((message, sender, sendreply) => {
  if (message == "getProfessors") {
    chrome.storage.local.get("professors").then(async (saved) => {
      if (saved.professors) {
        sendreply({professors: saved.professors});
        return;
      }
      try {
        await downloadEveryone();
        const fresh = await chrome.storage.local.get("professors");
        sendreply({professors: fresh.professors});
      }
      catch (error) {
        console.error("Download Failed:", error);
        sendreply({ error: error.message });
      }
    });
    return true;
  }
})
