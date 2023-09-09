import { Devvit, FormOnSubmitEvent } from '@devvit/public-api';

// Define what packages you want to use here
// Others include:
// kvStore: a simple key value store for persisting data across sessions within this installation
// media: used for importing and posting images
Devvit.configure({
  redditAPI: true, // context.reddit will now be available
  kvStore: true
}); 

// TO DO:
// add a CRON job so that the host gets a message notification when the giveaway expires, prompting them to go and select winners


// in progress:



const fakeNames = [
  "CoolUser123",
  "RedditorX",
  "BananaKing",
  "InternetGuru",
  "PixelPirate",
  "StarStruck99",
  "QuantumCoder",
  "MountainHiker",
  "CyberNinja42",
  "GalacticPanda",
  "TechSavvy23",
  "SunnyDayz",
  "GameMaster88",
  "CodingWizard",
  "CoffeeAddict",
  "MusicLover77",
  "Bookworm42",
  "MovieBuff101",
  "PizzaFanatic",
  "TravelExplorer",
  "CatLover55",
  "DogPerson99",
  "SoccerChamp17",
  "FitnessFreak",
  "NatureEnthusiast",
  "ArtisticSoul",
  "ScienceGeek22",
  "MemeLord",
  "FoodieAdventurer",
  "GamerGirl123",
  "SportsFanatic",
  "Fashionista",
  "TechNerd007",
  "AdventureSeeker",
  "SpaceExplorer",
  "AnimeFanatic",
  "HistoryBuff",
  "PuzzleSolver",
  "PetWhisperer",
  "PhotographyPro"
]

const chooseRandomNames = () => {
  let numNames = Math.floor(Math.random() * 40)
  const shuffled = fakeNames.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, numNames)
}

const newGiveawayHandler = async (event: FormOnSubmitEvent, context: Devvit.Context) => {
  let {reddit, ui, kvStore} = context
  const {title, desc, daysOpen} = event.values
  const subreddit = await reddit.getCurrentSubreddit();
  const user = await reddit.getCurrentUser()

  if (daysOpen < 1) {
    ui.showToast({
      text: 'Unable to make new giveaway! The "Number of Days" field must be greater than 0',
      appearance: 'neutral'
    })
  } else if (title == undefined) {
    ui.showToast({
      text: 'Unable to make new giveaway! The "Title" field cannot be empty',
      appearance: 'neutral'
    })
  } else if (desc == undefined) {
    ui.showToast({
      text: 'Unable to make new giveaway! The "Description" field cannot be empty',
      appearance: 'neutral'
    })
  } else {

    const post = await reddit.submitPost({
      // This will show while your custom post is loading
      preview: (
        <vstack padding="medium" cornerRadius="medium">
          <text style="heading" size="medium">
            Loading giveaway...
          </text>
        </vstack>
      ),
      title: `New Giveaway: ${title} by ${user.username}`,
      subredditName: subreddit.name
    });
    let expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + daysOpen)
    let dateString = expiryDate.toLocaleString()
    let postId = 'noIDfound'
    if (post.id != null) {
      postId = post.id
    }
    await kvStore.put(`giveaway:${postId}`, {title, desc, expiryDate: dateString, participants: [], host: user.username, winners: []})


    ui.showToast({
      text: `Successfully created a new giveaway!`,
      appearance: 'success',
    });
  }

  // let expiryDate = new Date()
  // expiryDate.setDate(expiryDate.getDate() + daysOpen)
  // let dateString = expiryDate.toLocaleString()
  // let postId = 'noIDfound'
  // await kvStore.put(`giveaway:${postId}`, {title, desc, expiryDate: dateString, participants: chooseRandomNames(), host: user.username, winners: []})

  
}

const newGiveawayForm = Devvit.createForm(
  {
    fields: [{name: 'title', label: 'Title', type: 'string'}, {name: 'desc', label: 'Description', type: 'paragraph'}, {name: 'daysOpen', label: 'Number of Days', type: 'number'}],
    title: 'New Giveaway',
    acceptLabel: 'Create'
  },
  newGiveawayHandler
)

const ParticipantView:Devvit.BlockComponent<any> = ({title, desc, username, joined, onJoin, partCount, expiry}) => {
  const now = new Date()
  const expiryDate = new Date(Date.parse(expiry))


  return (
    <vstack gap='small' padding='small'>
      <text style='heading' size='xxlarge'>{title}</text>
      <text style='body' size='medium'>{desc}</text>
      <vstack gap='none' alignment='top end'  >
        <text style='body' size='small'>Expires: {expiry}</text>
        <text style='body' size='small'>Participants: {partCount}</text>

      </vstack>
      <button appearance='primary' disabled={joined || now > expiryDate} onPress={onJoin}>
      {/* For testing only: */}
      {/* <button appearance='primary' disabled={joined} onPress={onJoin}> */}
        {now > expiryDate ? 'This giveaway has expired' : (joined ? "You've already joined" : 'Participate')}
        {/* {joined ? "You've already joined" : 'Participate'} */}
      </button>
      <text style='metadata'>Powered by /u/thegiver002 bot</text>
    </vstack>
  )
}

const chooseWinner = async (postID, partList, kvStore, setWinners, prevWinners) => {
  let winner = partList[Math.floor(Math.random() * partList.length)]
  while (prevWinners.includes(winner)) {
    winner = partList[Math.floor(Math.random() * partList.length)]
    if (prevWinners.length == partList) {
      return
    }
  }
  let oldInfo = await kvStore.get(`giveaway:${postID}`)
  if (oldInfo != null) {
    oldInfo.winners.push(winner)
    setWinners(oldInfo.winners)
  }
  await kvStore.put(`giveaway:${postID}`, oldInfo)
}





Devvit.addMenuItem({
  label: 'New Giveaway!',
  location: 'subreddit',
  onPress: (event, context) => {
    context.ui.showForm(newGiveawayForm)
  }
})

Devvit.addCustomPostType({
  name: 'Giveaway',

  render: (context) => {

    const {postId, kvStore} = context
    
    const [giveawayInfo] = context.useState(async () => await kvStore.get(`giveaway:${postId}`))
    // const [giveawayInfo] = context.useState(async () => await kvStore.get(`giveaway:noIDfound`)) // for debugging in dev env
    const [currentUsername] = context.useState(async () => {
      // Use the reddit API wrapper to get the current user name
      const currentUser = await context.reddit.getCurrentUser();
      return currentUser.username;
    });
    const [joined, setJoined] = context.useState(giveawayInfo.participants.includes(currentUsername))
    const [winners, setWinners] = context.useState(giveawayInfo.winners)


    const joinHandler = async () => {
      let newInfo = giveawayInfo
      newInfo.participants.push(currentUsername)
      await kvStore.put(`giveaway:${postId}`, newInfo)
      // await kvStore.put(`giveaway:noIDfound`, newInfo) // for debugging in dev env
      setJoined(true)
    }

    const notifyWinners = async (sendMessage, winnerList, giveawayName, hostName) => {
      await winnerList.forEach(async item => {
        await context.reddit.sendPrivateMessage({
          to: item,
          subject: `Congratulations! You won a giveaway!`,
          text: `It's your lucky day. Congratulations on winning the "${giveawayName}" giveaway hosted by ${hostName}! \n Please contact u/${hostName} to claim your prize.\n \n Please note, this is an automated messagae generated by u/thegiver002 bot`
        })
      });
      context.ui.showToast({
        text: `Successfully notified all winners!`,
        appearance: 'success',
      });
    }

    const HostView:Devvit.BlockComponent<any> = ({title, desc, onWinner, partCount, expiry, partList, winners, kvStore, setWinners, sendMessage, hostName, postId}) => {
      const now = new Date()
      const expiryDate = new Date(Date.parse(expiry))
    
      return (
        <vstack gap='small' padding='small'>
        <hstack alignment='start middle' gap='medium'>
          <text style='heading' size='xxlarge'>{title}</text>
          <text style='heading' size='medium'>[You're the host]</text>
    
        </hstack>
        <text style='body' size='medium'>{desc}</text>
        <vstack gap='none' alignment='top end'  >
          <text style='body' size='small'>Expires: {expiry}</text>
          <text style='body' size='small'>Participants: {partCount}</text>
          {/* <text style='body' size='small'>{partList.map((item:string) => item + ', ')}</text> */}
        </vstack>
        <vstack gap='none' alignment='top start'>
          <text style='body' size='small'>Winners ({winners.length > 0 ? winners.length : '0'}): {winners.map((item:string) => 'u/' + item + ', ')}</text>
        </vstack>
        <button appearance='primary' disabled={now < expiryDate || partCount == 0} onPress={() => chooseWinner(postId, partList, kvStore, setWinners, winners)}>
          {now < expiryDate ? "Too early to choose winners" : (partCount == 0 ? 'No Participants' : 'Choose a winner')}
        </button>
        {/* Actual Production onPress */}
        <button appearance='primary' disabled={winners.length == 0} onPress={async () => await notifyWinners(sendMessage, winners, title, hostName)}>
        {/* <button appearance='primary' disabled={winners.length == 0} onPress={() => notifyWinners(sendMessage, ['baamahmed'], title, hostName)}> */}
          {winners.length == 0 ? "No Winners Chosen" : 'Send Notifications to Winners'}
        </button>
        <text style='metadata'>Warning: the "Send Winner Notifications" button sends notifications to ALL winners, so do this action only when your winner list is complete :)</text>
        <text style='metadata'>Powered by /u/thegiver002 bot</text>
      </vstack>
      )
    }
    

    return (

      <blocks height="regular">
        <vstack padding="medium" cornerRadius="medium" gap="medium" alignment="middle">
          {giveawayInfo.host != currentUsername ? 
            <ParticipantView 
              title={giveawayInfo.title} 
              desc={giveawayInfo.desc} 
              expiry={giveawayInfo.expiryDate} 
              joined={joined} 
              userId={currentUsername} 
              partCount={(giveawayInfo.participants.length).toString()} 
              onJoin={joinHandler} 
            /> : 
            <HostView 
              title={giveawayInfo.title} 
              desc={giveawayInfo.desc} 
              expiry={giveawayInfo.expiryDate} 
              partCount={(giveawayInfo.participants.length).toString()}
              partList = {giveawayInfo.participants}
              onWinner={joinHandler} 
              winners={winners}
              setWinners={setWinners}
              kvStore={kvStore}
              hostName={giveawayInfo.host}
              sendMessage={context.reddit.sendPrivateMessage}
              postId={postId}
            />
          }
        </vstack>
      </blocks>
    );
  },
});

export default Devvit;
