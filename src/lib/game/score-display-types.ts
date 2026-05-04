export interface ScoreData {
	high_score: number;
	current_score: number;
	is_new_high_score: boolean;
	high_score_round: number;
	last_cleared_round: number;
	format_score: (value: number) => string;
}
