import mongoose, { Document, Schema } from 'mongoose';

export interface Aptitude extends Document {
  assessmentId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  questionIds: number[];
  duration: number;
  totalQuestions: number;
  passingScore: number;
  sections: {
    name: string;
    description?: string;
    questionIds: number[];
    timeLimit?: number;
  }[];
  status: 'inactive' | 'active' | 'completed';
  currentQuestionIndex: number;
  startTime?: Date;
  endTime?: Date;
  warnings: {
    fullscreen: number;
    tabSwitch: number;
    audio: number;
  };
  score?: number;
 
}

const aptitudeSchema: Schema<Aptitude> = new Schema(
  {
    assessmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment ID is required'],
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate ID is required'],
    },
    questionIds: [
      {
        type: Number,
        required: [true, 'Question IDs are required'],
      },
    ],
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [60, 'Minimum duration is 60 seconds'],
    },
    totalQuestions: {
      type: Number,
      required: [true, 'Total questions count is required'],
      min: [1, 'At least one question is required'],
    },
    passingScore: {
      type: Number,
      required: [true, 'Passing score is required'],
      min: [0, 'Passing score cannot be negative'],
      max: [100, 'Passing score cannot exceed 100'],
    },
    sections: [
      {
        name: {
          type: String,
          required: [true, 'Section name is required'],
        },
        description: String,
        questionIds: [
          {
            type: Number,
            required: [true, 'Section question IDs are required'],
          },
        ],
        timeLimit: Number,
        passingScore: Number,
      },
    ],
    status: {
      type: String,
      enum: ['inactive', 'active', 'completed'],
      default: 'inactive',
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    startTime: Date,
    endTime: Date,
    warnings: {
      fullscreen: {
        type: Number,
        default: 0,
        min: 0,
      },
      tabSwitch: {
        type: Number,
        default: 0,
        min: 0,
      },
      audio: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    score: {
      type: Number,
      min: 0,
    },
   
  },
  { timestamps: true }
);

aptitudeSchema.index({ candidateId: 1, status: 1 });
aptitudeSchema.index({ assessmentId: 1, candidateId: 1 }, { unique: true });

const Aptitude =
  (mongoose.models.Aptitude as mongoose.Model<Aptitude>) ||
  mongoose.model<Aptitude>('Aptitude', aptitudeSchema);

export default Aptitude;
