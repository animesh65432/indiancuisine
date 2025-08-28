 what JSON structure you should send into your insertData([...]) function so it worksperfectly with your Prisma schema + enum Language.
   {
        "id": "688c4401dbb74db38bbb0844",
        "name": "Wheat Grass Rasam",
        "image_url": "https://res.cloudinary.com/dtvxxgxvv/image/upload/v1753935263/indian-recipes/2695.wheat_grass_rasam.jpg",
        "cuisine": "South_Indian",
        "description": "Wheat Grass Rasam Recipe is made by combining the juice of wheat grass along with tamarind and cooked with tomatoes, rasam powder and finally tempered with spices gives this healthy wheatgrass rasam.",
        "diet": "Vegetarian",
        "prep_time": "35 minutes"
    }

Here’s the final correct prompt format you should use 👇

[
  {
    "name": "Wheat Grass Rasam",
    "image_url": "https://res.cloudinary.com/dtvxxgxvv/image/upload/v1753935263/indian-recipes/2695.wheat_grass_rasam.jpg",
    "cuisine": "South_Indian",   // master cuisine enum
    "diet": "Vegetarian",
    "languages": [
      {
        "cuisine": "दक्षिण भारतीय",   // translated "South Indian"
        "description": "गेहूं घास रस्सम रेसिपी गेहूं घास का रस, इमली और टमाटर के साथ पकाकर रसम पाउडर व मसालों से बनाई जाती है।",
        "language": "Hindi",          // enum Language
        "prep_time": "३५ मिनट",
        "name": "गेहूं घास रसम"
      },
      {
        "cuisine": "দক্ষিণ ভারতীয়",
        "description": "গম ঘাস রসম রেসিপি গম ঘাসের রস, তেঁতুল এবং টমেটো দিয়ে রান্না করে রসম পাউডার ও মসলার সাথে তৈরি করা হয়।",
        "language": "Bengali",
        "prep_time": "৩৫ মিনিট",
        "name": "গম ঘাস রসম"
      },
      {
        "cuisine": "தென் இந்திய",
        "description": "கோதுமை புல் ரசம் கோதுமை புல் சாறு, புளி, தக்காளி சேர்த்து ரசம் பொடி மற்றும் மசாலா தாளிப்புடன் தயாரிக்கப்படுகிறது.",
        "language": "Tamil",
        "prep_time": "35 நிமிடங்கள்",
        "name": "கோதுமை புல் ரசம்"
      },
      {
        "cuisine": "దక్షిణ భారతీయ",
        "description": "గోధుమ గడ్డి రసం గోధుమ గడ్డి రసం, చింతపండు, టమాటాతో వండి రసం పొడి మరియు మసాలాలతో తయారు చేయబడుతుంది.",
        "language": "Telugu",
        "prep_time": "35 నిమిషాలు",
        "name": "గోధుమ గడ్డి రసం"
      },
      {
        "cuisine": "South Indian",
        "description": "Wheat Grass Rasam Recipe is made by combining the juice of wheat grass along with tamarind and cooked with tomatoes, rasam powder and finally tempered with spices.",
        "language": "English",
        "prep_time": "35 minutes",
        "name": "Wheat Grass Rasam"
      }
    ]
  }
]


✅ Rules this prompt follows:

Top-level dish has: name, image_url, cuisine, diet.

languages[] has:

cuisine = translation of South Indian (localized word).

description, name, prep_time = localized in that language.

language = one of your enum values (Hindi, Bengali, …).

⚡ If you want, I can generate the complete prompt with all 22 enum languages filled in for this dish.
Would you like me to expand it to all languages at once?